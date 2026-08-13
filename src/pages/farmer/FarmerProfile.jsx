import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { farmersAPI, locationsAPI, authAPI } from '../../api';
import AvatarUpload from '../../components/AvatarUpload';
import toast from 'react-hot-toast';
import { MapPin } from 'lucide-react';

const FarmerProfile = () => {
  const { user, refetch } = useAuth();
  const [formData, setFormData] = useState({
    farm_name: user?.farmer_profile?.farm_name || '',
    bio: user?.farmer_profile?.bio || '',
    farm_description: user?.farmer_profile?.farm_description || '',
    farm_size: user?.farmer_profile?.farm_size || '',
    farming_type: user?.farmer_profile?.farming_type || 'conventional',
    years_farming: user?.farmer_profile?.years_farming || '',
    avatar_url: user?.farmer_profile?.avatar_url || user?.avatar_url || '',
    latitude: '', longitude: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({ ...prev, latitude: position.coords.latitude, longitude: position.coords.longitude }));
          toast.success('Location acquired');
        },
        () => toast.error('Geolocation failed')
      );
    }
  };

  // Saved immediately on pick. The same image is stored on the account so it
  // shows in the navbar, and on the farm profile so it shows on listings.
  const handleAvatarChange = async (url) => {
    setFormData(prev => ({ ...prev, avatar_url: url }));
    try {
      await Promise.all([
        farmersAPI.updateProfile({ ...formData, avatar_url: url }),
        authAPI.updateProfile({ avatar_url: url }),
      ]);
      await refetch();
      toast.success(url ? 'Profile photo updated' : 'Profile photo removed');
    } catch (err) {
      toast.error('Failed to save profile photo');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await farmersAPI.updateProfile(formData);
      if (formData.latitude && formData.longitude) {
        await locationsAPI.addAddress({ label: 'Farm Location', latitude: formData.latitude, longitude: formData.longitude, is_default: true, address_line1: 'Farm Coordinates' });
      }
      toast.success('Profile updated');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Farm Profile</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">Profile Photo</h2>
          <AvatarUpload
            user={user}
            value={formData.avatar_url}
            onChange={handleAvatarChange}
            size={112}
            hint="Shown on your farm page and product listings · JPG, PNG or WebP up to 10MB"
          />
        </div>

        <div className="card bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">Farm Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Farm Name</label>
              <input name="farm_name" value={formData.farm_name} onChange={handleChange} required className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Farming Type</label>
              <select name="farming_type" value={formData.farming_type} onChange={handleChange} className="w-full border p-2 rounded">
                <option value="organic">Organic</option>
                <option value="conventional">Conventional</option>
                <option value="hydroponic">Hydroponic</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Farm Size (acres/hectares)</label>
              <input name="farm_size" value={formData.farm_size} onChange={handleChange} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Years Farming</label>
              <input type="number" name="years_farming" value={formData.years_farming} onChange={handleChange} className="w-full border p-2 rounded" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Short Bio</label>
            <input name="bio" value={formData.bio} onChange={handleChange} maxLength="100" className="w-full border p-2 rounded" placeholder="Brief tagline..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Detailed Description</label>
            <textarea name="farm_description" value={formData.farm_description} onChange={handleChange} rows="4" className="w-full border p-2 rounded"></textarea>
          </div>
        </div>

        <div className="card bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2 className="text-lg font-semibold">Farm Location</h2>
            <button type="button" onClick={getLocation} className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded flex items-center gap-1 hover:bg-blue-100">
              <MapPin size={14}/> Use Current Location
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Latitude</label>
              <input name="latitude" value={formData.latitude} onChange={handleChange} className="w-full border p-2 rounded bg-gray-50" readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Longitude</label>
              <input name="longitude" value={formData.longitude} onChange={handleChange} className="w-full border p-2 rounded bg-gray-50" readOnly />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="px-6 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FarmerProfile;
