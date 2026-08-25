import { useCallback, useEffect, useState } from 'react'
import { Loader } from 'lucide-react'
import toast from 'react-hot-toast'

import { adminAPI, toList } from '../../api'
import { usePrivatePageSeo } from '../../utils/seo'

/**
 * Every purchase request, for an admin.
 *
 * The table used to render `{r.customer}`, `{r.farmer}` and `{r.product}`
 * directly. All three are **objects** in `PurchaseRequest.to_dict` — `customer`
 * is `{id, full_name, avatar_url}`, not a name — and React throws on an object
 * child rather than ignoring it, so the whole page came down as soon as a
 * single request existed. An empty database hid it completely.
 */

// The server's page size. The Next button was hardcoded to 15 and the API
// returns 20, so the last page of a 16-to-19-row result was unreachable and a
// full page of 20 looked like the end of the list.
const PER_PAGE = 20

// Every status the enum can hold, not the four somebody remembered. Filtering
// for `preparing` or `out_for_delivery` was impossible, which is most of what
// an admin actually wants to look at.
const STATUSES = [
  ['', 'All statuses'],
  ['pending', 'Pending'],
  ['admin_review', 'Admin review'],
  ['accepted', 'Accepted'],
  ['rejected', 'Rejected'],
  ['chat_active', 'In discussion'],
  ['confirmed', 'Confirmed'],
  ['preparing', 'Preparing'],
  ['picked_up', 'Picked up'],
  ['ready_for_pickup', 'Ready for pickup'],
  ['out_for_delivery', 'Out for delivery'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
]

// `.status-*` classes that actually exist in index.css. The rest fall back to
// a neutral badge rather than an unstyled one — the same class of bug as the
// object-child above, just quieter.
const STYLED = new Set(['pending', 'accepted', 'rejected', 'preparing',
  'picked_up', 'out_for_delivery', 'completed', 'cancelled'])

const badgeFor = (status) =>
  STYLED.has(status) ? `badge status-${status}` : 'badge badge-gray'

export default function AdminRequests() {
  usePrivatePageSeo('Requests')

  const [requests, setRequests] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminAPI.requests({
        // Omitted rather than sent empty: `status=` filters for the empty
        // string on some backends and returns nothing at all.
        status: statusFilter || undefined,
        page,
        per_page: PER_PAGE,
      })
      setRequests(toList(res.data))
      setTotal(res.data?.total ?? 0)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  // Changing the filter while on page 3 asked for page 3 of a different, often
  // shorter list — and showed an empty table that looked like no results.
  useEffect(() => { setPage(1) }, [statusFilter])

  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <div className="section-sm">
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 18 }}>
        <div>
          <h1 className="text-h2">Requests</h1>
          <p className="text-sm text-muted">
            {loading ? 'Loading…' : `${total} request${total === 1 ? '' : 's'}`}
          </p>
        </div>
        <select
          className="form-input touch-target"
          style={{ maxWidth: 220 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUSES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader className="animate-spin" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center p-12" style={{ background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)' }}>
          <h3 className="text-h4">No requests found</h3>
          <p className="text-sm text-muted" style={{ marginTop: 4 }}>
            {statusFilter ? 'Try a different status.' : 'None have been placed yet.'}
          </p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', minWidth: 820 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>ID</th>
                  <th style={{ textAlign: 'left' }}>Customer</th>
                  <th style={{ textAlign: 'left' }}>Farm</th>
                  <th style={{ textAlign: 'left' }}>Product</th>
                  <th style={{ textAlign: 'right' }}>Quantity</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'left' }}>Delivery</th>
                  <th style={{ textAlign: 'left' }}>Status</th>
                  <th style={{ textAlign: 'left' }}>Placed</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>#{r.id}</td>
                    {/* Optional chaining throughout: an order whose customer or
                        product was since deleted has null there, and a missing
                        name should be a dash rather than a crash. */}
                    <td>{r.customer?.full_name || '—'}</td>
                    <td>{r.farmer?.farm_name || r.farmer?.full_name || '—'}</td>
                    <td>{r.product?.name || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {r.quantity != null ? `${r.quantity} ${r.product?.unit || ''}`.trim() : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {r.total_price != null ? `₹${Number(r.total_price).toFixed(2)}` : '—'}
                    </td>
                    <td className="text-muted">{r.courier?.full_name || 'Unassigned'}</td>
                    <td>
                      <span className={badgeFor(r.status)}>
                        {String(r.status || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="text-muted">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between" style={{ marginTop: 20 }}>
            <button
              type="button"
              className="btn btn-sm btn-secondary touch-target"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span className="text-sm font-semibold">Page {page} of {lastPage}</span>
            <button
              type="button"
              className="btn btn-sm btn-secondary touch-target"
              // Driven by the server's total rather than by how many rows came
              // back. A full page is not evidence that there is another one.
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= lastPage}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}
