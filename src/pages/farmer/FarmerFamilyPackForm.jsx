import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Package, Check, ChevronRight, Leaf, ShieldCheck, Upload } from 'lucide-react'
import { familyPacksAPI, productsAPI, uploadsAPI } from '../../api'
import toast from 'react-hot-toast'
import {
  MAX_UPLOAD_MB, IMAGE_ACCEPT, isProbablyImage, prepareImageForUpload, mediaUrl,
} from '../../utils/image'

export default function FarmerFamilyPackForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  // Converting a HEIC photo and uploading it takes a visible moment, and the
  // drop target gives no other sign it is working.
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [myProducts, setMyProducts] = useState([])
  const [currentStep, setCurrentStep] = useState(1) // Step 1: Products, 2: Quantities, 3: Pricing & Details

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    banner_image: '',
    price: '',
    is_active: true,
    items: [],
  })

  useEffect(() => {
    fetchInitialData()
  }, [id])

  const fetchInitialData = async () => {
    try {
      const prodRes = await productsAPI.list({ per_page: 100 })
      setMyProducts(prodRes.data.items || [])

      if (isEdit) {
        const packRes = await familyPacksAPI.get(id)
        const p = packRes.data
        setFormData({
          name: p.name,
          description: p.description || '',
          banner_image: p.banner_image || '',
          price: p.price,
          is_active: p.is_active,
          items: (p.items || []).map(i => ({
            product_id: i.product_id,
            quantity: i.quantity,
          }))
        })
      }
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // let the same file be re-picked after a failure
    if (!file) return
    // The picker's `accept` is a hint, not a rule — a determined drag-and-drop
    // or an "All Files" override gets past it. Re-checked here, and again on
    // the server.
    if (!isProbablyImage(file)) {
      toast.error('That is not an image. Choose a JPG, PNG, WEBP or HEIC file.')
      return
    }
    setUploadingBanner(true)
    try {
      // iPhone photos arrive as HEIC; convert to JPEG, fix rotation and shrink
      // them in the browser before uploading.
      const prepared = await prepareImageForUpload(file)
      if (prepared.size > MAX_UPLOAD_MB * 1024 * 1024) {
        toast.error(`Image must be smaller than ${MAX_UPLOAD_MB}MB`)
        return
      }
      const res = await uploadsAPI.uploadImage(prepared, 'products')
      setFormData(f => ({ ...f, banner_image: res.data.url }))
      toast.success('Banner image uploaded')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploadingBanner(false)
    }
  }

  const addItemRow = () => {
    if (myProducts.length === 0) {
      toast.error('You need active products to create a Family Pack')
      return
    }
    setFormData(f => ({
      ...f,
      items: [...f.items, { product_id: myProducts[0].id, quantity: 1 }]
    }))
  }

  const removeItemRow = (index) => {
    setFormData(f => ({
      ...f,
      items: f.items.filter((_, i) => i !== index)
    }))
  }

  const updateItemRow = (index, field, value) => {
    setFormData(f => {
      const updated = [...f.items]
      updated[index] = { ...updated[index], [field]: value }
      return { ...f, items: updated }
    })
  }

  const calculatedSum = formData.items.reduce((sum, item) => {
    const prod = myProducts.find(p => p.id === Number(item.product_id))
    return sum + (prod ? prod.price * Number(item.quantity || 0) : 0)
  }, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.items.length === 0) {
      toast.error('Please add at least one product to the pack')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        banner_image: formData.banner_image,
        price: Number(formData.price),
        is_active: formData.is_active,
        items: formData.items.map(i => ({
          product_id: Number(i.product_id),
          quantity: Number(i.quantity)
        }))
      }

      if (isEdit) {
        await familyPacksAPI.update(id, payload)
        toast.success('Family Pack updated')
      } else {
        await familyPacksAPI.create(payload)
        toast.success('Family Pack created! Sent for admin approval.')
      }
      navigate('/farmer/family-packs')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save Family Pack')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="skeleton" style={{ height: 350, borderRadius: 16 }} />

  return (
    <div className="section-sm" style={{ maxWidth: 840, margin: '0 auto' }}>
      <div className="flex items-center gap-2 text-sm text-muted" style={{ marginBottom: 20 }}>
        <Link to="/farmer/family-packs" className="flex items-center gap-1">
          <ArrowLeft size={14} /> Back to My Family Packs
        </Link>
      </div>

      <div style={{ marginBottom: 24 }}>
        <span className="badge badge-success flex items-center gap-1" style={{ marginBottom: 6 }}>
          <Leaf size={12} /> FAMILY PACK BUILDER
        </span>
        <h1 className="text-h2">
          {isEdit ? 'Edit Family Pack' : 'Build a New Family Pack'}
        </h1>
        <p className="text-sm text-muted">Curate a weekly bundle of your fresh farm produce for doorstep delivery.</p>
      </div>

      {/* ── Multi-Step Builder Header ── */}
      <div className="fp-builder-steps">
        <div className={`fp-step-item ${currentStep >= 1 ? 'active' : ''}`}>
          <div className="fp-step-num">01</div>
          <span>Choose Products</span>
        </div>
        <ChevronRight size={16} color="var(--color-gray-300)" />
        <div className={`fp-step-item ${currentStep >= 2 ? 'active' : ''}`}>
          <div className="fp-step-num">02</div>
          <span>Set Quantities</span>
        </div>
        <ChevronRight size={16} color="var(--color-gray-300)" />
        <div className={`fp-step-item ${currentStep >= 3 ? 'active' : ''}`}>
          <div className="fp-step-num">03</div>
          <span>Price & Details</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: 28, background: 'white', borderRadius: 'var(--radius-2xl)', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Step 1 & 2: Products & Quantities */}
        <div style={{ border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-xl)', padding: 20 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <div>
              <label className="form-label" style={{ marginBottom: 2, fontSize: '1rem' }}>Pack Contents & Quantities *</label>
              <p className="text-xs text-muted">Select products from your active farm list</p>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addItemRow} style={{ borderRadius: 'var(--radius-full)' }}>
              <Plus size={14} /> Add Product
            </button>
          </div>

          {formData.items.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <Package size={32} color="var(--color-gray-300)" />
              <p className="text-sm text-muted" style={{ marginTop: 8 }}>No products added yet. Click "Add Product" above.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {formData.items.map((item, idx) => {
                const selectedProd = myProducts.find(p => p.id === Number(item.product_id))
                return (
                  <div key={idx} className="flex gap-3 items-center flex-wrap" style={{ padding: 14, background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-200)' }}>
                    <select
                      className="form-select flex-1"
                      value={item.product_id}
                      onChange={(e) => updateItemRow(idx, 'product_id', e.target.value)}
                      style={{ minWidth: 200 }}
                    >
                      {myProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (₹{p.price}/{p.unit})
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-2">
                      <input
                        className="form-input"
                        type="number"
                        step="0.1"
                        min="0.1"
                        placeholder="Qty"
                        style={{ width: 90, textAlign: 'center' }}
                        value={item.quantity}
                        onChange={(e) => updateItemRow(idx, 'quantity', e.target.value)}
                      />
                      <span className="text-xs font-semibold text-muted">{selectedProd?.unit || 'unit'}</span>
                    </div>

                    <button type="button" className="btn btn-ghost btn-icon text-error" onClick={() => removeItemRow(idx)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {formData.items.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-gray-200)', display: 'flex', justifyBetween: 'space-between', alignItems: 'center' }}>
              <span className="text-xs text-muted">Estimated sum of individual product prices:</span>
              <span className="font-extrabold text-dark">₹{calculatedSum.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Step 3: Title, Description & Pricing */}
        <div className="form-group">
          <label className="form-label">Pack Title *</label>
          <input
            className="form-input"
            placeholder="e.g. Weekly Veggie Feast Bundle"
            value={formData.name}
            onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Explain what makes this Family Pack special for local families..."
            value={formData.description}
            onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">Fixed Pack Price (₹) *</label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              placeholder="e.g. 499.00"
              value={formData.price}
              onChange={(e) => setFormData(f => ({ ...f, price: e.target.value }))}
              required
            />
            <span className="text-xs text-muted">Hint: You can offer a bundle discount compared to ₹{calculatedSum.toFixed(2)}.</span>
          </div>

          <div className="form-group">
            <label className="form-label">Pack Banner Image</label>

            {/* A styled drop target instead of the browser's "Choose File".
                The native control cannot be restyled, shows the OS-default
                button and a "no file chosen" label, and looks nothing like the
                rest of this form. The real input is still here — hidden inside
                the label, which is what makes clicking anywhere on the box open
                the picker and keeps it reachable by keyboard. */}
            {formData.banner_image ? (
              <div style={{ position: 'relative' }}>
                <img
                  src={mediaUrl(formData.banner_image)}
                  alt="Pack banner"
                  style={{
                    width: '100%', height: 120, borderRadius: 'var(--radius-lg)',
                    objectFit: 'cover', display: 'block',
                  }}
                />
                <div className="flex gap-2" style={{ marginTop: 8 }}>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                    <Upload size={14} /> Replace
                    <input
                      type="file"
                      accept={IMAGE_ACCEPT}
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingBanner}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setFormData(f => ({ ...f, banner_image: '' }))}
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <label
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 6,
                  width: '100%', height: 120,
                  border: '2px dashed var(--color-gray-200)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-gray-50)',
                  color: 'var(--color-gray-600)',
                  cursor: uploadingBanner ? 'progress' : 'pointer',
                  margin: 0,
                }}
              >
                <Upload size={22} />
                <span className="text-sm font-semibold">
                  {uploadingBanner ? 'Uploading…' : 'Add a banner image'}
                </span>
                <span className="text-xs text-muted">
                  JPG, PNG, WEBP or HEIC · up to {MAX_UPLOAD_MB}MB
                </span>
                <input
                  type="file"
                  accept={IMAGE_ACCEPT}
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingBanner}
                />
              </label>
            )}
          </div>
        </div>

        <div className="form-group flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData(f => ({ ...f, is_active: e.target.checked }))}
          />
          <label htmlFor="is_active" className="text-sm font-semibold">
            Active and available for customer ordering
          </label>
        </div>

        <div className="flex justify-end gap-3" style={{ marginTop: 12, paddingTop: 16, borderTop: '1px solid var(--color-gray-100)' }}>
          <Link to="/farmer/family-packs" className="btn btn-secondary">Cancel</Link>
          <button type="submit" className="btn btn-primary btn-lg touch-target" disabled={submitting} style={{ borderRadius: 'var(--radius-full)', padding: '12px 32px' }}>
            {submitting ? 'Saving...' : isEdit ? 'Update Pack' : 'Save & Submit for Approval'}
          </button>
        </div>
      </form>
    </div>
  )
}
