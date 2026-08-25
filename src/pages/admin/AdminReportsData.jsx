import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, CloudUpload, Download, Loader, RefreshCw, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminAPI } from '../../api'
import { REPORTS, formatCell, humanise, isMoneyKey } from '../../utils/reports'
import { usePrivatePageSeo } from '../../utils/seo'

/**
 * The three scheduled reports, on screen.
 *
 * Same rows the spreadsheet is built from — the server sends columns, labels
 * and number formats alongside the data, so this table and the file in Drive
 * cannot drift apart. Nothing about the shape of a report is decided here.
 *
 * Lives at `/admin/insights` rather than `/admin/reports`, which content
 * moderation already owns.
 */
export default function AdminReportsData() {
  usePrivatePageSeo('Reports')

  const [slug, setSlug] = useState(REPORTS[0].slug)
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: null, dir: 'asc' })

  const report = REPORTS.find((r) => r.slug === slug)

  const load = async (which) => {
    setLoading(true)
    setPayload(null)
    // Reset per-report view state: a sort on a column the next report does not
    // have would silently do nothing, and a stale search would hide rows for
    // no visible reason.
    setQuery('')
    setSort({ key: null, dir: 'asc' })
    try {
      const res = await adminAPI.reportData(which)
      setPayload(res.data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not load that report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(slug) }, [slug])

  const download = async () => {
    setBusy('download')
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
      toast.error('Could not build the file')
    } finally {
      setBusy(null)
    }
  }

  const publish = async () => {
    setBusy('publish')
    try {
      const res = await adminAPI.publishReport(slug)
      if (res.data.published) toast.success(`${res.data.file?.name || slug} updated in Drive`)
      else if (res.data.skipped) toast(res.data.reason || 'Google Drive is not set up yet', { icon: '⚠️' })
      else toast.error('Nothing was published')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not publish to Drive')
    } finally {
      setBusy(null)
    }
  }

  const columns = payload?.columns ?? []
  const formats = useMemo(
    () => Object.fromEntries(columns.map((c) => [c.key, c.format])),
    [columns]
  )

  /**
   * Filter, then sort. Both derived rather than stored, so the underlying rows
   * are never mutated and clearing the search restores everything exactly.
   */
  const rows = useMemo(() => {
    let out = payload?.rows ?? []

    const q = query.trim().toLowerCase()
    if (q) {
      out = out.filter((row) =>
        columns.some((c) => String(row[c.key] ?? '').toLowerCase().includes(q))
      )
    }

    if (sort.key) {
      // Copied before sorting — `Array.sort` is in-place, and sorting the
      // memoised source would reorder it permanently.
      out = [...out].sort((a, b) => {
        const x = a[sort.key]
        const y = b[sort.key]
        // Blanks last regardless of direction: an empty cell is absence, not a
        // low value, and burying them keeps the interesting rows together.
        if (x === null || x === undefined || x === '') return 1
        if (y === null || y === undefined || y === '') return -1
        const both = typeof x === 'number' && typeof y === 'number'
        const cmp = both ? x - y : String(x).localeCompare(String(y))
        return sort.dir === 'asc' ? cmp : -cmp
      })
    }
    return out
  }, [payload, query, sort, columns])

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  return (
    <div className="section-sm admin-insights">
      <div style={{ marginBottom: 20 }}>
        <h1 className="text-h2">Reports</h1>
        <p className="text-sm text-muted">
          The same figures that go to Google Drive {report.cadence}, live from the database.
        </p>
      </div>

      {/* Report switcher */}
      <div className="flex gap-2 flex-wrap" style={{ marginBottom: 18 }}>
        {REPORTS.map((r) => (
          <button
            key={r.slug}
            type="button"
            className={`btn btn-sm touch-target ${r.slug === slug ? 'btn-primary font-bold' : 'btn-secondary'}`}
            onClick={() => setSlug(r.slug)}
          >
            {r.name}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted" style={{ maxWidth: 720, lineHeight: 1.6, marginBottom: 18 }}>
        {report.blurb}
      </p>

      {loading ? (
        <div className="flex justify-center p-12"><Loader className="animate-spin" /></div>
      ) : !payload ? (
        <div className="empty-state text-center p-12">
          <p className="text-muted">Nothing to show.</p>
        </div>
      ) : (
        <>
          {/* Headline figures, straight from the report's own summary */}
          <div className="grid-auto" style={{ gap: 12, marginBottom: 20 }}>
            {Object.entries(payload.summary || {}).map(([key, value]) => (
              <div key={key} className="card" style={{ padding: 16, borderRadius: 'var(--radius-lg)' }}>
                <div className="text-xs text-muted" style={{ marginBottom: 4 }}>{humanise(key)}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                  {isMoneyKey(key) ? formatCell(value, 'money') : formatCell(value, 'integer')}
                </div>
              </div>
            ))}
          </div>

          {payload.subtitle && (
            <p className="text-xs text-muted" style={{ marginBottom: 14 }}>{payload.subtitle}</p>
          )}

          <div className="products-toolbar flex gap-3" style={{ marginBottom: 14 }}>
            <div className="input-icon-wrap" style={{ flex: 1 }}>
              <Search size={16} className="icon-left" />
              <input
                className="form-input touch-target"
                placeholder={`Search ${rows.length} row${rows.length === 1 ? '' : 's'}…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search rows"
              />
            </div>
            <button type="button" className="btn btn-secondary touch-target"
                    onClick={() => load(slug)} disabled={busy !== null}>
              <RefreshCw size={16} /> Refresh
            </button>
            <button type="button" className="btn btn-secondary touch-target"
                    onClick={download} disabled={busy !== null}>
              <Download size={16} /> {busy === 'download' ? 'Building…' : 'Download'}
            </button>
            <button type="button" className="btn btn-ghost touch-target"
                    onClick={publish} disabled={busy !== null}>
              <CloudUpload size={16} /> {busy === 'publish' ? 'Publishing…' : 'Update in Drive'}
            </button>
          </div>

          <div className="data-table-wrap overflow-x-auto">
            <table className="data-table w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b">
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className="p-3 whitespace-nowrap"
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => toggleSort(c.key)}
                      title={`Sort by ${c.label}`}
                    >
                      <span className="flex items-center gap-1">
                        {c.label}
                        {sort.key === c.key && (
                          sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  // The server marks rows worth attention — a product out of
                  // stock, a farm with nothing listed, a split buy. The same
                  // flag drives the shading in the spreadsheet.
                  <tr key={i} className={`border-b row-${row._highlight || 'plain'}`}>
                    {columns.map((c) => (
                      <td key={c.key} className="p-3" data-label={c.label}>
                        {formatCell(row[c.key], formats[c.key])}
                      </td>
                    ))}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="p-6 text-center text-muted" colSpan={columns.length}>
                      {query ? `Nothing matches “${query}”.` : 'This report is empty.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted" style={{ marginTop: 12 }}>
            Generated {payload.generated_at} (UTC) · {payload.rows.length} row
            {payload.rows.length === 1 ? '' : 's'}
            {rows.length !== payload.rows.length && ` · ${rows.length} shown`}
          </p>
        </>
      )}
    </div>
  )
}
