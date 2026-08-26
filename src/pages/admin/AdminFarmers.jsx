import { useCallback, useEffect, useState } from 'react'
import { Loader, Search } from 'lucide-react'
import toast from 'react-hot-toast'

import { adminAPI, toList } from '../../api'
import { usePrivatePageSeo } from '../../utils/seo'

/**
 * Farmers, and whether they are verified or suspended.
 *
 * `/admin/farmers` returns a **User** dict with the farm nested underneath:
 *
 *     { id, email, is_verified, …, farmer_profile: { farm_name, is_verified,
 *                                                    is_suspended, … } }
 *
 * This page used to read all of it flat, which produced three separate faults
 * from one mistake:
 *
 *   * `f.is_verified` is the *User's* flag — account/email verification. The
 *     Verify button sets `FarmerProfile.is_verified`, a different field, so the
 *     figure the page was reading never changed and the button never went away.
 *     That is the bug that got noticed.
 *   * `f.farm_name` does not exist at the top level, so the first column was
 *     silently blank.
 *   * `f.is_suspended` likewise, so every farmer read "Active" and the button
 *     always said "Suspend" regardless of what it would actually do.
 *
 * Everything farm-shaped now comes from `farmer_profile`; `email` stays on the
 * user, which is where it lives.
 */

const PER_PAGE = 20

export default function AdminFarmers() {
  usePrivatePageSeo('Farmers')

  const [farmers, setFarmers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [search])

  const fetchFarmers = useCallback(async () => {
    setLoading(true)
    try {
      // `q` is what the endpoint reads. The old call sent `search` as well,
      // which was ignored — harmless, but it made the API look like it took
      // both.
      const res = await adminAPI.farmers({ q: debouncedSearch, page, per_page: PER_PAGE })
      setFarmers(toList(res.data))
      setTotal(res.data?.total ?? 0)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load farmers')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, page])

  useEffect(() => { fetchFarmers() }, [fetchFarmers])

  /**
   * Both endpoints toggle rather than set, and both return the new value.
   *
   * Applied to the row in place instead of refetching the page: a refetch after
   * a toggle re-runs the search and the pagination, so verifying the last
   * farmer on page 2 could move them and leave you looking at a different row.
   */
  const toggle = async (userId, action) => {
    setBusyId(`${userId}-${action}`)
    try {
      const { data } = action === 'verify'
        ? await adminAPI.verifyFarmer(userId)
        : await adminAPI.suspendFarmer(userId)

      setFarmers((rows) => rows.map((row) => (
        row.id === userId
          ? { ...row, farmer_profile: { ...row.farmer_profile, ...data } }
          : row
      )))

      toast.success(
        action === 'verify'
          ? (data.is_verified ? 'Farmer verified' : 'Verification removed')
          : (data.is_suspended ? 'Farmer suspended' : 'Farmer reinstated')
      )
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update farmer')
    } finally {
      setBusyId(null)
    }
  }

  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <div className="section-sm">
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 18 }}>
        <div>
          <h1 className="text-h2">Farmers</h1>
          <p className="text-sm text-muted">
            {loading ? 'Loading…' : `${total} farmer${total === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="input-icon-wrap" style={{ minWidth: 240 }}>
          <Search size={16} className="icon-left" />
          <input
            type="text"
            className="form-input touch-target"
            placeholder="Search by farm or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader className="animate-spin" /></div>
      ) : farmers.length === 0 ? (
        <div className="text-center p-12" style={{ background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)' }}>
          <h3 className="text-h4">No farmers found</h3>
          {debouncedSearch && (
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>
              Nothing matches “{debouncedSearch}”.
            </p>
          )}
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Farm</th>
                  <th style={{ textAlign: 'left' }}>Contact</th>
                  <th style={{ textAlign: 'left' }}>Verification</th>
                  <th style={{ textAlign: 'left' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {farmers.map((f) => {
                  // Everything farm-shaped lives here, not on the user.
                  const fp = f.farmer_profile || {}
                  const verified = !!fp.is_verified
                  const suspended = !!fp.is_suspended
                  return (
                    <tr key={f.id}>
                      <td data-label="Farm">
                        <div className="font-bold text-dark">{fp.farm_name || '—'}</div>
                        {f.full_name && (
                          <div className="text-xs text-muted">{f.full_name}</div>
                        )}
                      </td>
                      <td data-label="Contact" className="text-muted">
                        <div>{f.email || '—'}</div>
                        {f.phone && <div className="text-xs">{f.phone}</div>}
                      </td>
                      <td data-label="Verification">
                        <span className={`badge ${verified ? 'badge-success' : 'badge-warning'}`}>
                          {verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td data-label="Status">
                        <span className={`badge ${suspended ? 'badge-error' : 'badge-success'}`}>
                          {suspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td data-label="Actions" style={{ textAlign: 'right' }}>
                        <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                          {/*
                            Both actions toggle, so the label says what will
                            happen rather than what the state is. "Verify" on an
                            already-verified farmer would have been a lie about
                            an endpoint that flips the flag either way.
                          */}
                          <button
                            type="button"
                            className={`btn btn-sm touch-target ${verified ? 'btn-secondary' : 'btn-primary'}`}
                            disabled={busyId === `${f.id}-verify`}
                            onClick={() => toggle(f.id, 'verify')}
                          >
                            {verified ? 'Unverify' : 'Verify'}
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm touch-target ${suspended ? 'btn-secondary' : 'btn-danger'}`}
                            disabled={busyId === `${f.id}-suspend`}
                            onClick={() => toggle(f.id, 'suspend')}
                          >
                            {suspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
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
