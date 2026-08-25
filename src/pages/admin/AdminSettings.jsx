import { useEffect, useState } from 'react'
import { BellRing, CloudUpload, Download, IndianRupee, Loader, RotateCcw, Save, Sheet, Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminAPI } from '../../api'
import { REPORTS } from '../../utils/reports'
import { usePrivatePageSeo } from '../../utils/seo'

/**
 * Figures that used to need a deploy to change.
 *
 * The order minimum lived in `MIN_ORDER_VALUE`, an environment variable read at
 * boot, so changing it meant editing the server's .env and restarting — not
 * something an admin can do. In practice the figure was frozen at whatever it
 * was on the day the server was last touched.
 *
 * The bounds here mirror `MIN_ORDER_FLOOR` and `MIN_ORDER_CEILING` in
 * backend/app/models/settings.py. The server rejects anything outside them
 * regardless; these exist so the admin is told before they submit, not after.
 */

const FLOOR = 1
const CEILING = 10000

// DELIVERY_CHARGE_FLOOR / DELIVERY_CHARGE_CEILING on the server. A delivery
// costs a van, a driver and a round trip, so below the floor is a fee that does
// not cover what it is charging for. Charging nothing is done by clearing the
// field, not by typing 0 — see the helper text on the input.
const DELIVERY_FLOOR = 50
const DELIVERY_CEILING = 500

/**
 * What each self-test outcome means, and what to do about it.
 *
 * Keyed by the `verdict` from `push_service.diagnose`. Kept out of the
 * component because the next-step wording is the actual content here — the
 * verdict alone is a label, and a label is what the admin already had.
 */
const PUSH_VERDICTS = {
  server: {
    tone: 'row-warn',
    headline: 'The server cannot send notifications at all',
    next: 'Nothing reaches any phone until this is fixed. The reason below comes from the server itself.',
  },
  no_devices: {
    tone: 'row-note',
    headline: 'No phone is registered to your account',
    next: 'The app registers a device when you sign in. Open F2H on the phone and sign in — if you were already signed in, sign out and back in — then run this again.',
  },
  rejected: {
    tone: 'row-warn',
    headline: 'Firebase refused the request',
    next: 'The credential reached Firebase and was turned away. Usually a service-account key that has been revoked, or one belonging to a different project than the app.',
  },
  all_failed: {
    tone: 'row-warn',
    headline: 'Every registered device rejected it',
    next: 'Devices marked "reinstalled" are normal — that token is gone and has now been removed. Sign in on the phone again to register a fresh one.',
  },
  sent: {
    tone: 'row-info',
    headline: 'Firebase accepted the notification',
    next: 'The server side is working. If the phone stayed silent the cause is on the handset: notifications turned off for F2H in Android settings, battery optimisation, or Do Not Disturb.',
  },
  error: {
    tone: 'row-warn',
    headline: 'The test itself failed',
    next: 'Check the server log — this is a fault in the diagnostic, not necessarily in push.',
  },
}

export default function AdminSettings() {
  usePrivatePageSeo('Settings')

  const [settings, setSettings] = useState(null)
  const [value, setValue] = useState('')
  const [delivery, setDelivery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingDelivery, setSavingDelivery] = useState(false)
  // Which report is currently downloading, or null. A single boolean would
  // spin every button at once.
  const [exporting, setExporting] = useState(null)
  // Which report is publishing — or 'all' for the run-everything button.
  const [publishing, setPublishing] = useState(null)
  const [testingPush, setTestingPush] = useState(false)
  const [pushResult, setPushResult] = useState(null)

  /**
   * Send a test notification to your own phone and report where it stopped.
   *
   * Push fails in four unrelated ways that look identical from a silent phone,
   * so the result is a verdict rather than a boolean. See
   * `push_service.diagnose` for what each one means.
   *
   * The endpoint answers 200 even when the send fails — the failure *is* the
   * result — so the catch below is for the request genuinely not arriving.
   */
  const testPush = async () => {
    setTestingPush(true)
    setPushResult(null)
    try {
      const { data } = await adminAPI.pushSelfTest()
      setPushResult(data)
      if (data.verdict === 'sent') {
        toast.success(`Sent to ${data.delivered} of ${data.attempted} device(s)`)
      } else {
        toast(PUSH_VERDICTS[data.verdict]?.headline || 'Push is not working', { icon: '⚠️' })
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not reach the server')
    } finally {
      setTestingPush(false)
    }
  }

  /**
   * Rebuild reports and push them to Drive now.
   *
   * `slug` omitted publishes all three. The same job the cron runs, so the
   * button and the schedule cannot produce different files.
   *
   * A `skipped` result is reported as information, not failure: it means Drive
   * has not been configured yet, which is a setup step nobody has done rather
   * than something going wrong. Showing a red banner for that would send an
   * admin looking for a fault that does not exist.
   */
  const publish = async (slug) => {
    setPublishing(slug || 'all')
    try {
      const res = slug
        ? await adminAPI.publishReport(slug)
        : await adminAPI.publishReports()

      // Publishing all three returns a list; publishing one returns a single
      // result. Normalise so the rest of this reads the same either way.
      const results = res.data.results || [res.data]
      const done = results.filter((r) => r.published)
      const skipped = results.filter((r) => r.skipped)
      const failed = results.filter((r) => r.error)

      // Each outcome gets its own message rather than one summary line. The
      // partial case is the interesting one: two reports current and one
      // broken is not "success" and not "failure", and collapsing it to either
      // loses the half the admin needs to act on.
      if (done.length) {
        toast.success(
          done.length === 1
            ? `${done[0].file?.name || done[0].report} updated in Drive`
            : `${done.length} reports updated in Drive`
        )
      }
      if (skipped.length) {
        // The reason names the missing piece — folder id, credentials file.
        toast(skipped[0].reason || 'Google Drive is not set up yet', { icon: '⚠️' })
      }
      if (failed.length) {
        toast.error(`${failed.map((r) => r.report).join(', ')} failed — check the server log`)
      }
      if (!done.length && !skipped.length && !failed.length) {
        toast.error('Nothing was published')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not publish to Drive')
    } finally {
      setPublishing(null)
    }
  }

  const busy = exporting !== null || publishing !== null

  /**
   * Download the farmers-and-stock spreadsheet.
   *
   * The file has to come through axios rather than a plain `<a href>`, because
   * the endpoint needs the auth cookie *and* the CSRF header — a bare link
   * sends neither and lands on a 401. So: fetch as a blob, hand it to the
   * browser through a temporary object URL, then revoke it. Skipping the revoke
   * leaks the whole file in memory until the tab is closed.
   *
   * The filename comes from the server's Content-Disposition so the download
   * and the copy in Drive are named identically.
   */
  const exportReport = async (slug) => {
    setExporting(slug)
    try {
      const res = await adminAPI.report(slug)
      const match = /filename="([^"]+)"/.exec(res.headers['content-disposition'] || '')
      const url = URL.createObjectURL(res.data)
      const link = document.createElement('a')
      link.href = url
      link.download = match ? match[1] : `F2H-${slug}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not build the report')
    } finally {
      setExporting(null)
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminAPI.settings()
      setSettings(res.data)
      // Blank when nothing has been customised, so the placeholder can show the
      // default in grey. Prefilling with the default would make "never set" and
      // "deliberately set to the default" look identical.
      setValue(res.data.is_customised ? String(res.data.min_order_value) : '')
      // Blank when unset, so the placeholder shows the default in grey.
      // Prefilling would make "no charge configured" and "deliberately set to
      // ₹0" look identical — for a delivery fee those are different decisions.
      setDelivery(
        res.data.delivery_charge_is_customised ? String(res.data.delivery_charge) : ''
      )
    } catch {
      toast.error('Could not load settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const problem = (() => {
    if (!value.trim()) return null          // blank is a valid instruction: use the default
    const n = Number(value)
    if (!Number.isFinite(n)) return 'Enter the minimum order as a number'
    if (n < FLOOR || n > CEILING) return `Must be between ₹${FLOOR} and ₹${CEILING}`
    return null
  })()

  const save = async (next) => {
    setSaving(true)
    try {
      const res = await adminAPI.updateSettings({ min_order_value: next })
      setSettings(res.data)
      setValue(res.data.is_customised ? String(res.data.min_order_value) : '')
      toast.success(
        next === null
          ? `Back to the default of ₹${res.data.min_order_value}`
          : `Minimum order is now ₹${res.data.min_order_value}`
      )
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not save that')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (problem) return
    // An empty field means "use the default", which the API expresses as null.
    save(value.trim() === '' ? null : Number(value))
  }

  const deliveryProblem = (() => {
    if (!delivery.trim()) return null       // blank means "use the default"
    const n = Number(delivery)
    if (!Number.isFinite(n)) return 'Enter the delivery charge as a number'
    if (n < DELIVERY_FLOOR || n > DELIVERY_CEILING) {
      return `Must be between ₹${DELIVERY_FLOOR} and ₹${DELIVERY_CEILING}`
    }
    return null
  })()

  const saveDelivery = async (e) => {
    e.preventDefault()
    if (deliveryProblem) return
    const next = delivery.trim() === '' ? null : Number(delivery)

    setSavingDelivery(true)
    try {
      const res = await adminAPI.updateSettings({ delivery_charge: next })
      setSettings(res.data)
      setDelivery(
        res.data.delivery_charge_is_customised ? String(res.data.delivery_charge) : ''
      )
      toast.success(
        res.data.delivery_charge > 0
          ? `Delivery charge is now ₹${res.data.delivery_charge}`
          : 'Delivery is now free'
      )
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not save that')
    } finally {
      setSavingDelivery(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12"><Loader className="animate-spin" /></div>
    )
  }

  const effective = settings?.min_order_value
  const fallback = settings?.min_order_value_default

  return (
    <div className="section-sm">
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-h2">Settings</h1>
        <p className="text-sm text-muted">
          Changes take effect immediately, for the website and the app alike.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card"
        style={{ padding: 28, borderRadius: 'var(--radius-2xl)', maxWidth: 560 }}
      >
        <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
          <IndianRupee size={18} className="text-muted" />
          <h2 className="text-h4">Minimum order</h2>
        </div>
        <p className="text-sm text-muted" style={{ lineHeight: 1.6, marginBottom: 18 }}>
          The smallest total a customer can check out with. It applies to a whole
          cart rather than to each item, so a customer can mix produce from
          several farms to reach it. Every order is a trip with someone
          collecting cash at the end, so below this the trip costs more than the
          order is worth.
        </p>

        <div className="form-group">
          <label className="form-label" htmlFor="min-order">Amount in rupees</label>
          <input
            id="min-order"
            className="form-input touch-target"
            type="number"
            inputMode="decimal"
            min={FLOOR}
            max={CEILING}
            step="1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`${fallback} (default)`}
            aria-describedby="min-order-help"
          />
          <small id="min-order-help" className="text-muted" style={{ display: 'block', marginTop: 6 }}>
            {problem
              ? <span style={{ color: 'var(--color-error)' }}>{problem}</span>
              : settings?.is_customised
                ? <>Currently ₹{effective}. Clear the field to go back to ₹{fallback}.</>
                : <>Using the default of ₹{fallback}. Type a number to change it.</>}
          </small>
        </div>

        {settings?.updated_at && (
          <p className="text-xs text-muted" style={{ marginBottom: 16 }}>
            Last changed {new Date(settings.updated_at).toLocaleString()}
            {settings.updated_by ? ` by ${settings.updated_by}` : ''}
          </p>
        )}

        <div className="flex gap-2 flex-wrap">
          <button
            type="submit"
            className="btn btn-primary touch-target"
            disabled={saving || !!problem}
          >
            <Save size={16} /> {saving ? 'Saving…' : 'Save'}
          </button>

          {/* Only offered when there is something to undo. */}
          {settings?.is_customised && (
            <button
              type="button"
              className="btn btn-secondary touch-target"
              onClick={() => save(null)}
              disabled={saving}
            >
              <RotateCcw size={16} /> Reset to ₹{fallback}
            </button>
          )}
        </div>
      </form>

      <p className="text-xs text-muted" style={{ marginTop: 16, maxWidth: 560, lineHeight: 1.6 }}>
        Carts already open are re-checked against the new figure when the
        customer next loads the cart or tries to check out. Nothing is deleted —
        a cart below the new minimum is told how much more to add.
      </p>

      <form
        onSubmit={saveDelivery}
        className="card"
        style={{ padding: 28, borderRadius: 'var(--radius-2xl)', maxWidth: 560, marginTop: 20 }}
      >
        <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
          <Truck size={18} className="text-muted" />
          <h2 className="text-h4">Delivery charge</h2>
        </div>
        <p className="text-sm text-muted" style={{ lineHeight: 1.6, marginBottom: 8 }}>
          A flat fee added at checkout. Charged once per order however many items
          are in the basket — a five-item cart pays it once, not five times.
          Orders the customer collects from the farm are not charged it at all.
        </p>
        <p className="text-sm text-muted" style={{ lineHeight: 1.6, marginBottom: 18 }}>
          It goes to F2H in full. The farmer is paid their share of the produce
          only, so raising this does not change what any farmer is owed.
        </p>

        <div className="form-group">
          <label className="form-label" htmlFor="delivery-charge">Amount in rupees</label>
          <input
            id="delivery-charge"
            className="form-input touch-target"
            type="number"
            inputMode="decimal"
            min={DELIVERY_FLOOR}
            max={DELIVERY_CEILING}
            step="1"
            value={delivery}
            onChange={(e) => setDelivery(e.target.value)}
            placeholder={`${settings?.delivery_charge_default ?? 0} (default)`}
            aria-describedby="delivery-help"
          />
          <small id="delivery-help" className="text-muted" style={{ display: 'block', marginTop: 6 }}>
            {deliveryProblem
              ? <span style={{ color: 'var(--color-error)' }}>{deliveryProblem}</span>
              : settings?.delivery_charge_is_customised
                ? <>Currently ₹{settings.delivery_charge}. Clear the field to stop charging for delivery.</>
                : <>No delivery charge is being applied. Type a number from ₹{DELIVERY_FLOOR} upwards to start charging one.</>}
          </small>
        </div>

        <button
          type="submit"
          className="btn btn-primary touch-target"
          disabled={savingDelivery || !!deliveryProblem}
        >
          <Save size={16} /> {savingDelivery ? 'Saving…' : 'Save'}
        </button>
      </form>

      {REPORTS.map(({ slug, name, blurb, cadence }) => (
        <div
          key={slug}
          className="card"
          style={{ padding: 28, borderRadius: 'var(--radius-2xl)', maxWidth: 560, marginTop: 20 }}
        >
          <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
            <Sheet size={18} className="text-muted" />
            <h2 className="text-h4">{name}</h2>
          </div>
          <p className="text-sm text-muted" style={{ lineHeight: 1.6, marginBottom: 8 }}>
            {blurb}
          </p>
          <p className="text-xs text-muted" style={{ marginBottom: 18 }}>
            Goes to Google Drive {cadence}, on its own.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-secondary touch-target"
              onClick={() => exportReport(slug)}
              disabled={busy}
            >
              <Download size={16} />
              {exporting === slug ? 'Building…' : 'Download'}
            </button>
            <button
              type="button"
              className="btn btn-ghost touch-target"
              onClick={() => publish(slug)}
              disabled={busy}
            >
              <CloudUpload size={16} />
              {publishing === slug ? 'Publishing…' : 'Update in Drive'}
            </button>
          </div>
        </div>
      ))}

      {/*
        The whole-set button, after the three cards rather than before them, so
        the page reads as "here are the reports" and then "…and here is how to
        refresh all of them" — rather than offering an action for things the
        reader has not met yet.
      */}
      <div
        className="card"
        style={{
          padding: 24, borderRadius: 'var(--radius-2xl)', maxWidth: 560, marginTop: 20,
          background: 'var(--color-primary-50)', borderColor: 'var(--color-primary-200)',
        }}
      >
        <h2 className="text-h4" style={{ marginBottom: 6 }}>Refresh all three now</h2>
        <p className="text-sm text-muted" style={{ lineHeight: 1.6, marginBottom: 16 }}>
          Rebuilds every report and updates the copies in Google Drive — the same
          job that runs on its own every 2 days. Worth pressing when something has
          just changed and the files in Drive are a day behind: a farmer restocked,
          a basket was cancelled, prices moved.
        </p>
        <button
          type="button"
          className="btn btn-primary touch-target"
          onClick={() => publish()}
          disabled={busy}
        >
          <CloudUpload size={16} />
          {publishing === 'all' ? 'Publishing all three…' : 'Publish all three to Drive'}
        </button>
      </div>

      <div
        className="card"
        style={{ padding: 28, borderRadius: 'var(--radius-2xl)', maxWidth: 560, marginTop: 20 }}
      >
        <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
          <BellRing size={18} className="text-muted" />
          <h2 className="text-h4">Test notifications</h2>
        </div>
        <p className="text-sm text-muted" style={{ lineHeight: 1.6, marginBottom: 18 }}>
          Sends a real notification to your own phone, down the same code path
          every order update uses. A phone that stays quiet looks the same
          whether the server has no credentials, no device is registered, or
          Android is holding the notification back — this says which.
        </p>

        <button
          type="button"
          className="btn btn-secondary touch-target"
          onClick={testPush}
          disabled={testingPush}
        >
          <BellRing size={16} />
          {testingPush ? 'Sending…' : 'Send a test notification'}
        </button>

        {pushResult && (() => {
          const verdict = PUSH_VERDICTS[pushResult.verdict] || PUSH_VERDICTS.error
          return (
            <div
              className={verdict.tone}
              style={{ marginTop: 18, padding: 16, borderRadius: 'var(--radius-lg)' }}
            >
              <p style={{ fontWeight: 600, marginBottom: 6 }}>{verdict.headline}</p>

              {pushResult.verdict === 'sent' && (
                <p className="text-sm" style={{ marginBottom: 8 }}>
                  Delivered to {pushResult.delivered} of {pushResult.attempted} registered device
                  {pushResult.attempted === 1 ? '' : 's'}.
                </p>
              )}

              {pushResult.push_problem && (
                <p className="text-sm" style={{ marginBottom: 8, fontFamily: 'monospace' }}>
                  {pushResult.push_problem}
                </p>
              )}

              <p className="text-sm" style={{ lineHeight: 1.6 }}>{verdict.next}</p>

              {/*
                The one result that looks like success and is not. Real
                notifications are dispatched to a background task; this test
                sends synchronously. So FCM can be healthy, the tokens current,
                and still nothing is ever sent — see `background_tasks_run`.
              */}
              {pushResult.background_ok === false && (
                <p
                  className="text-sm"
                  style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,.12)', lineHeight: 1.6 }}
                >
                  <strong>But real notifications are not being sent.</strong>{' '}
                  The server can talk to Firebase, yet background tasks never
                  run{pushResult.async_mode ? ` (async_mode is "${pushResult.async_mode}")` : ''} —
                  so every automatic notification is queued and abandoned. The
                  backend has to be started by <code>python run.py</code>, which
                  calls <code>eventlet.monkey_patch()</code>. Served any other
                  way, this test still passes and nothing else does.
                </p>
              )}

              {pushResult.failures?.length > 0 && (
                <ul className="text-sm" style={{ marginTop: 10, paddingLeft: 18 }}>
                  {pushResult.failures.map((f, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      {f.platform || 'device'} — {f.dead ? 'app was reinstalled or removed (token retired)' : f.error}
                    </li>
                  ))}
                </ul>
              )}

              {/* Shown for every verdict, because "which phones does the server
                  think I have" is the question behind most of them — and an
                  account with three stale rows and no current one explains a
                  silence that otherwise looks like a server fault. */}
              {pushResult.devices?.length > 0 && (
                <p className="text-xs text-muted" style={{ marginTop: 10 }}>
                  Registered: {pushResult.devices.map((d) => (
                    `${d.platform || 'unknown'}${d.last_seen_at ? `, last seen ${new Date(d.last_seen_at).toLocaleDateString()}` : ''}`
                  )).join(' · ')}
                </p>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
