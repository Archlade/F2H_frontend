import { useCallback, useEffect, useState } from 'react'
import { Package, Pencil, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'

import { adminAPI, categoriesAPI, toList } from '../../api'

/**
 * The produce F2H sells inside a weekly basket.
 *
 * These are not farmers' listings. An admin creates them, F2H sources them
 * against the baskets actually ordered, and they are the only thing a customer
 * can put in a basket. Behind the scenes each one is an ordinary product with
 * `basket_eligible` and `basket_only` set and the platform seller as its owner
 * — which is what keeps it out of the marketplace, out of one-off orders, and
 * out of the stock checks.
 *
 * No stock field. These are unlimited by design: you buy in against what was
 * ordered, so a quantity here would be a number nobody maintains that could
 * only ever be wrong.
 */

const money = (n) => `₹${Number(n || 0).toFixed(2)}`

const BLANK = { name: '', price: '', unit: 'kg', category_id: '', min_quantity: '1', description: '' }

// The units produce is actually sold in here. A free-text box produced "Kg",
// "kg", "KG" and "kilo" in the same catalogue, and the basket builder shows
// whatever is stored.
const UNITS = ['kg', 'g', 'litre', 'ml', 'piece', 'bunch', 'dozen', 'packet']

export default function BasketItems() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(null)      // null = closed; object = open
  const [editingId, setEditingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [itemsRes, catRes] = await Promise.all([
        adminAPI.basketItems(),
        categoriesAPI.list(),
      ])
      setItems(toList(itemsRes.data))
      setCategories(toList(catRes.data))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not load basket items')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditingId(null)
    setForm({ ...BLANK, category_id: categories[0]?.id || '' })
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setForm({
      name: item.name || '',
      price: String(item.price ?? ''),
      unit: item.unit || 'kg',
      category_id: item.category?.id || item.category_id || '',
      min_quantity: String(item.min_quantity ?? '1'),
      description: item.description || '',
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        min_quantity: Number(form.min_quantity),
        category_id: Number(form.category_id),
      }
      if (editingId) {
        await adminAPI.updateBasketItem(editingId, payload)
        toast.success(`${form.name} updated`)
      } else {
        await adminAPI.createBasketItem(payload)
        toast.success(`${form.name} added to weekly baskets`)
      }
      setForm(null)
      setEditingId(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not save that item')
    } finally {
      setSaving(false)
    }
  }

  const retire = async (item) => {
    if (!window.confirm(
      `Retire ${item.name}?\n\n` +
      'It disappears from the basket builder straight away. Baskets that ' +
      'already contain it keep it until the customer next edits them.'
    )) return
    try {
      await adminAPI.retireBasketItem(item.id)
      toast.success(`${item.name} retired`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not retire that item')
    }
  }

  const live = items.filter((i) => i.is_active)
  const retired = items.filter((i) => !i.is_active)

  return (
    <div className="card" style={{ padding: 24, borderRadius: 'var(--radius-2xl)', marginTop: 24 }}>
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 6 }}>
        <div className="flex items-center gap-2">
          <Package size={18} className="text-muted" />
          <h2 className="text-h4">Basket items</h2>
        </div>
        <button type="button" className="btn btn-primary touch-target" onClick={form ? () => setForm(null) : openNew}>
          {form ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add item</>}
        </button>
      </div>

      <p className="text-sm text-muted" style={{ lineHeight: 1.6, marginBottom: 18 }}>
        What customers can put in a weekly basket. These are yours, not a farm's
        — they do not appear in the shop and cannot be bought on their own. You
        source them against the baskets that come in, so there is no stock to
        keep up to date.
      </p>

      {form && (
        <form onSubmit={submit} style={{
          padding: 18, marginBottom: 18,
          background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)',
        }}>
          <h3 className="text-h4" style={{ marginBottom: 14 }}>
            {editingId ? 'Edit item' : 'New basket item'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="bi-name">Name</label>
              <input id="bi-name" className="form-input touch-target" required
                     value={form.name}
                     onChange={(e) => setForm({ ...form, name: e.target.value })}
                     placeholder="e.g. Tomatoes" />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="bi-price">Price</label>
              <input id="bi-price" className="form-input touch-target" type="number"
                     step="0.01" min="0.01" required inputMode="decimal"
                     value={form.price}
                     onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="bi-unit">Unit</label>
              <select id="bi-unit" className="form-input touch-target" value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="bi-category">Category</label>
              <select id="bi-category" className="form-input touch-target" required
                      value={form.category_id}
                      onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Choose…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="bi-min">Minimum per basket</label>
              <input id="bi-min" className="form-input touch-target" type="number"
                     step="0.1" min="0.1" required inputMode="decimal"
                     value={form.min_quantity}
                     onChange={(e) => setForm({ ...form, min_quantity: e.target.value })} />
              <small className="text-muted" style={{ display: 'block', marginTop: 4 }}>
                The least a customer can add, in {form.unit}.
              </small>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="form-label" htmlFor="bi-desc">Description (optional)</label>
            <input id="bi-desc" className="form-input touch-target"
                   value={form.description}
                   onChange={(e) => setForm({ ...form, description: e.target.value })}
                   placeholder="Shown under the name in the basket builder" />
          </div>

          <button type="submit" className="btn btn-primary touch-target" style={{ marginTop: 16 }} disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add to baskets'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : live.length === 0 ? (
        <p className="text-sm text-muted">
          No basket items yet. Add one above — customers see exactly this list
          when they build a weekly basket, on the website and in the app.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', minWidth: 560 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Item</th>
                <th style={{ textAlign: 'left' }}>Category</th>
                <th style={{ textAlign: 'right' }}>Price</th>
                <th style={{ textAlign: 'right' }}>Minimum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {live.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="font-bold text-dark">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-muted">{item.description}</div>
                    )}
                  </td>
                  <td className="text-muted">{item.category?.name || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{money(item.price)} / {item.unit}</td>
                  <td style={{ textAlign: 'right' }} className="text-muted">
                    {item.min_quantity} {item.unit}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => openEdit(item)}>
                        <Pencil size={13} /> Edit
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => retire(item)}>
                        Retire
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Kept visible rather than filtered away. A retired item still appears
          on old baskets and orders, and "where did that go?" is easier to
          answer when it is on the same page. */}
      {retired.length > 0 && (
        <p className="text-xs text-muted" style={{ marginTop: 14 }}>
          Retired: {retired.map((i) => i.name).join(', ')}
        </p>
      )}
    </div>
  )
}
