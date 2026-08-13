import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api';
import AvatarUpload from '../../components/AvatarUpload';
import toast from 'react-hot-toast';

const CustomerProfile = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    avatar_url: user?.avatar_url || ''
  });
  const [passData, setPassData] = useState({ current_password: '', new_password: '' });
  const [loading, setLoading] = useState(false);

  const saveProfile = async (values) => {
    const res = await authAPI.updateProfile(values);
    updateUser(res.data.user || res.data);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveProfile(formData);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // The photo is saved as soon as it is chosen, so it appears everywhere
  // without waiting for the rest of the form.
  const handleAvatarChange = async (url) => {
    const next = { ...formData, avatar_url: url };
    setFormData(next);
    try {
      await saveProfile(next);
      toast.success(url ? 'Profile photo updated' : 'Profile photo removed');
    } catch (err) {
      toast.error('Failed to save profile photo');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      await authAPI.changePassword(passData);
      setPassData({ current_password: '', new_password: '' });
      toast.success('Password changed successfully');
    } catch (err) {
      toast.error('Failed to change password');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="section-header mb-6">
        <h1 className="text-2xl font-bold">Profile Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <form onSubmit={handleProfileSubmit} className="card p-6 border rounded-lg bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">Personal Information</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="form-group">
                <label className="form-label block text-sm font-medium mb-1">First Name</label>
                <input className="form-input w-full border rounded p-2" type="text" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label block text-sm font-medium mb-1">Last Name</label>
                <input className="form-input w-full border rounded p-2" type="text" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} required />
              </div>
            </div>

            <div className="form-group mb-4">
              <label className="form-label block text-sm font-medium mb-1">Phone Number</label>
              <input className="form-input w-full border rounded p-2" type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>

            <div className="form-group mb-6">
              <label className="form-label block text-sm font-medium mb-1">Avatar URL</label>
              <input className="form-input w-full border rounded p-2" type="url" placeholder="Or paste an image link" value={formData.avatar_url} onChange={e => setFormData({...formData, avatar_url: e.target.value})} />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>

          <form onSubmit={handlePasswordSubmit} className="card p-6 border rounded-lg bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">Change Password</h2>
            
            <div className="form-group mb-4">
              <label className="form-label block text-sm font-medium mb-1">Current Password</label>
              <input className="form-input w-full border rounded p-2" type="password" value={passData.current_password} onChange={e => setPassData({...passData, current_password: e.target.value})} required />
            </div>

            <div className="form-group mb-6">
              <label className="form-label block text-sm font-medium mb-1">New Password</label>
              <input className="form-input w-full border rounded p-2" type="password" value={passData.new_password} onChange={e => setPassData({...passData, new_password: e.target.value})} required />
            </div>

            <button type="submit" className="btn btn-secondary bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300">
              Update Password
            </button>
          </form>
        </div>

        <div className="md:col-span-1">
          <div className="card p-6 border rounded-lg bg-white shadow-sm flex flex-col items-center">
            <div style={{ marginBottom: 16 }}>
              <AvatarUpload
                user={user}
                value={formData.avatar_url}
                onChange={handleAvatarChange}
                size={128}
              />
            </div>
            <h3 className="font-semibold text-xl">{user?.full_name}</h3>
            <p className="text-gray-500">{user?.email}</p>
            <span className="badge badge-info mt-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs capitalize">{user?.role}</span>
          </div>

          {/* Set apart from the profile controls above rather than sitting
              among them: this one is irreversible and should not be reachable
              by a mis-click aimed at something else. */}
          <div className="mt-6 pt-4 border-t text-center">
            <Link
              to="/account/delete"
              className="text-sm inline-flex items-center gap-1"
              style={{ color: 'var(--color-error, #DC2626)', fontWeight: 600 }}
            >
              <Trash2 size={14} /> Delete my account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;
