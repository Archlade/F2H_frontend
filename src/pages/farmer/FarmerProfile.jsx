import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { farmersAPI, authAPI } from '../../api';
import AvatarUpload from '../../components/AvatarUpload';
import FarmLocationFields from '../../components/FarmLocationFields';
import { EMPTY_FARM_LOCATION, farmLocationProblems } from '../../utils/validators';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';

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
  });

  // Seeded from the profile the server sent.
  //
  // `farmer_profile.location` is new: `/auth/me` used to return a profile with
  // no location in it at all, so this screen had nothing to show and opened
  // with two empty coordinate boxes however long ago the farm was pinned.
  const saved = user?.farmer_profile?.location;
  const [location, setLocation] = useState({
    ...EMPTY_FARM_LOCATION,
    address_line1: saved?.address_line1 || '',
    city: saved?.city || '',
    state: saved?.state || '',
    postal_code: saved?.postal_code || '',
    latitude: saved?.latitude ?? '',
    longitude: saved?.longitude ?? '',
  });
  const [locationErrors, setLocationErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // True for a farm that has never had a readable address — including the ones
  // pinned by the old version of this screen, which saved coordinates and
  // nothing else. Those are exactly the farms the listing guard now stops.
  const incomplete = Object.keys(farmLocationProblems(location)).length > 0;

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

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

    const problems = farmLocationProblems(location);
    if (Object.keys(problems).length) {
      setLocationErrors(problems);
      toast.error('Please complete your farm location');
      return;
    }
    setLocationErrors({});

    setLoading(true);
    try {
      // The location travels with the profile in one request.
      //
      // It used to be a second call to `/locations`, an endpoint that takes any
      // `location_type` and validates nothing — and this screen sent it bare
      // coordinates, so a farm's actual address was never saveable from the one
      // page that asks for it. `PUT /farmers/profile` now validates and upserts
      // the farm row itself.
      await farmersAPI.updateProfile({ ...formData, location });
      await refetch();
      toast.success('Profile updated');
    } catch (err) {
      // The server's message, not a generic one. "Failed to update profile"
      // told the farmer nothing about which field it objected to.
      toast.error(err.response?.data?.error || 'Failed to update profile');
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
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">Farm Location</h2>

          {/* Said before the fields, not after a failed save. A farm whose
              location is incomplete cannot list new produce, and the farmer is
              owed that in plain words at the moment they can fix it. */}
          {incomplete && (
            <div className="flex gap-2" style={{
              padding: 12, marginBottom: 16,
              background: 'var(--color-accent-50, #FFFBEB)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-accent-800, #92400E)',
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span className="text-sm" style={{ fontWeight: 600 }}>
                Your farm location is incomplete, so you cannot list new produce yet.
                Fill in the address below and save.
              </span>
            </div>
          )}

          {/* The same field group as signup — one address form, not a third
              copy of it. What was here collected latitude and longitude only,
              which a customer cannot read and which this page saved to an
              endpoint nothing looked at. */}
          <FarmLocationFields
            value={location}
            onChange={setLocation}
            errors={locationErrors}
            disabled={loading}
            heading={null}
            note={null}
          />
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
