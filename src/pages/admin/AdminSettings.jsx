import { useEffect, useState } from 'react'
import { CloudUpload, Download, IndianRupee, Loader, RotateCcw, Save, Sheet } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminAPI } from '../../api'
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

/**
 * The reports the admin can pull on demand.
 *
 * Slugs match the server's — see `_reports()` in backend/app/routes/cron.py.
 * Adding a third report here needs only a new entry, because the endpoint and
 * the download handler are both slug-driven.
 */
const REPORTS = [
  {
    slug: 'farmer-stock',
    name: 'Farmers & stock',
    blurb: 'Every farmer with their products and what is left in stock. Farms '
      + 'that have listed nothing are included, so you can see who signed up '
      + 'and never added produce.',
    cadence: 'every 2 days',
  },
  {
    slug: 'basket-orders',
    name: 'Upcoming weekly baskets',
    blurb: 'Basket deliveries due over the next fortnight, one row per product, '
      + 'with quantity and price. Sort by product to see how much of each thing '
      + 'has to be sourced.',
    cadence: 'every 2 days',
  },
  {
    slug: 'buying-plan',
    name: 'Buying plan',
    blurb: 'What to buy for the next basket delivery, and from which farm — '
      + 'cheapest first, with anything short of stock flagged. Built by '
      + 'matching what the baskets need against what the farms have.',
    cadence: 'every 2 days',
  },
]

const FLOOR = 1
const CEILING = 10000

export default function AdminSettings() {
  usePrivatePageSeo('Settings')

  const [settings, setSettings] = useState(null)
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // Which report is currently downloading, or null. A single boolean would
  // spin every button at once.
  const [exporting, setExporting] = useState(null)
  // Which report is publishing — or 'all' for the run-everything button.
  const [publishing, setPublishing] = useState(null)

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
    </div>
  )
}
