import React, { useEffect, useState } from 'react';
import { locationsAPI } from '../../api';
import { Loader, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { addressProblem } from '../../utils/validators';

// Field names must match the API payload exactly (postal_code, not zip_code) —
// the server rejects the whole request when a required field is missing.
const EMPTY_FORM = {
  label: '',
  recipient_name: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'India',
  is_default: false,
};

// Surface what the server actually said instead of a generic failure toast.
const errorMessage = (err, fallback) =>
  err?.response?.data?.error || err?.message || fallback;

const CustomerAddresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const fetchAddresses = async () => {
    try {
      const res = await locationsAPI.getAddresses();
      setAddresses(res.data || []);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to load addresses'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const set = (field) => (e) =>
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));

  const openCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (addr) => {
    setEditingId(addr.id);
    setFormData({
      label: addr.label || '',
      recipient_name: addr.recipient_name || '',
      phone: addr.phone || '',
      address_line1: addr.address_line1 || '',
      address_line2: addr.address_line2 || '',
      city: addr.city || '',
      state: addr.state || '',
      postal_code: addr.postal_code || '',
      country: addr.country || 'India',
      is_default: !!addr.is_default,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    // Trim before sending — a field of only spaces satisfies `required` in the
    // browser but fails the server's emptiness check.
    const payload = Object.fromEntries(
      Object.entries(formData).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
    );

    // Mirrors the server's address_problem(). Both fields were only `required`
    // before, so any text passed — including a state that does not exist and a
    // PIN from the wrong end of the country.
    const addressIssue = addressProblem(payload.state, payload.postal_code);
    if (addressIssue) {
      toast.error(addressIssue);
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await locationsAPI.updateAddress(editingId, payload);
        toast.success('Address updated');
      } else {
        await locationsAPI.addAddress(payload);
        toast.success('Address added successfully');
      }
      closeModal();
      fetchAddresses();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to save address'));
    } finally {
      setSaving(false);
    }
  };

  const handleMakeDefault = async (addr) => {
    try {
      await locationsAPI.updateAddress(addr.id, { is_default: true });
      toast.success('Default address updated');
      fetchAddresses();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to update default address'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      await locationsAPI.deleteAddress(id);
      toast.success('Address deleted');
      setAddresses(addresses.filter((a) => a.id !== id));
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to delete address'));
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center flex-wrap gap-3 mb-6">
        <h1 className="text-2xl font-bold">My Addresses</h1>
        <button onClick={openCreate} className="btn btn-primary bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 touch-target">
          <Plus size={18} /> Add Address
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader className="animate-spin" /></div>
      ) : addresses.length === 0 ? (
        <div className="empty-state text-center p-12 bg-gray-50 rounded-lg">
          <MapPin className="empty-state__icon mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium">No saved addresses</h3>
          <p className="text-gray-500 mt-2">Add an address for faster checkout.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {addresses.map(addr => (
            <div key={addr.id} className="card p-5 border rounded-lg relative bg-white shadow-sm">
              {addr.is_default && <span className="absolute top-4 right-4 text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded">Default</span>}
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="text-gray-400" size={20} />
                <h3 className="font-semibold text-lg">{addr.label || 'Address'}</h3>
              </div>
              {addr.recipient_name && <p className="text-gray-800 font-medium">{addr.recipient_name}</p>}
              {addr.phone && <p className="text-gray-500 text-sm mb-1">{addr.phone}</p>}
              <p className="text-gray-600 mb-1">{addr.address_line1}</p>
              {addr.address_line2 && <p className="text-gray-600 mb-1">{addr.address_line2}</p>}
              <p className="text-gray-600">{addr.city}, {addr.state} {addr.postal_code}</p>
              {addr.country && <p className="text-gray-500 text-sm">{addr.country}</p>}

              <div className="mt-4 pt-4 border-t flex flex-wrap gap-4">
                <button onClick={() => openEdit(addr)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium">
                  <Pencil size={16} /> Edit
                </button>
                {!addr.is_default && (
                  <button onClick={() => handleMakeDefault(addr)} className="text-gray-600 hover:text-gray-900 flex items-center gap-1 text-sm font-medium">
                    <Star size={16} /> Set default
                  </button>
                )}
                <button onClick={() => handleDelete(addr.id)} className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm font-medium">
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal-bottom-sheet" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="text-h4">{editingId ? 'Edit Address' : 'Add New Address'}</h2>
              <button type="button" className="btn btn-ghost btn-icon touch-target" onClick={closeModal} aria-label="Close">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '65vh', overflowY: 'auto' }}>
                <div className="form-group">
                  <label className="form-label">Label (e.g. Home, Work)</label>
                  <input className="form-input touch-target" required value={formData.label} onChange={set('label')} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Recipient Name (Optional)</label>
                    <input className="form-input touch-target" autoComplete="name" value={formData.recipient_name} onChange={set('recipient_name')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone (Optional)</label>
                    <input className="form-input touch-target" type="tel" inputMode="tel" autoComplete="tel" value={formData.phone} onChange={set('phone')} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address Line 1</label>
                  <input className="form-input touch-target" required autoComplete="address-line1" value={formData.address_line1} onChange={set('address_line1')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Address Line 2 (Optional)</label>
                  <input className="form-input touch-target" autoComplete="address-line2" value={formData.address_line2} onChange={set('address_line2')} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className="form-input touch-target" required autoComplete="address-level2" value={formData.city} onChange={set('city')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input className="form-input touch-target" required autoComplete="address-level1" value={formData.state} onChange={set('state')} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">PIN / Postal Code</label>
                    <input className="form-input touch-target" required inputMode="numeric" autoComplete="postal-code" value={formData.postal_code} onChange={set('postal_code')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input className="form-input touch-target" autoComplete="country-name" value={formData.country} onChange={set('country')} />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer touch-target text-sm">
                  <input type="checkbox" checked={formData.is_default} onChange={set('is_default')} />
                  Set as default address
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary touch-target" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary touch-target" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerAddresses;
