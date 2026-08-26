import React, { useState, useEffect } from 'react';
import { productsAPI, categoriesAPI, uploadsAPI } from '../../api';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader, Upload, X } from 'lucide-react';
import { MAX_UPLOAD_MB, isProbablyImage, prepareImagesForUpload, IMAGE_ACCEPT, mediaUrl } from '../../utils/image';

const FarmerProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', category_id: '', description: '', price: '', unit: 'kg', 
    min_quantity: 1, available_quantity: 0, low_stock_threshold: 5,
    is_organic: false, is_natural: false, is_homemade: false, delivery_available: true, pickup_available: true,
    images: [], is_active: true
  });

  useEffect(() => {
    categoriesAPI.list().then(res => setCategories(res.data || [])).catch(() => toast.error('Failed to load categories'));
    if (isEditing) {
      productsAPI.get(id).then(res => {
        // The API returns images as objects; the form works with plain URLs.
        setFormData({
          ...res.data,
          images: (res.data.images || []).map(img => (typeof img === 'string' ? img : img.image_url)),
        });
      }).catch(() => toast.error('Failed to load product')).finally(() => setLoading(false));
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files).filter(isProbablyImage);
    e.target.value = ''; // let the same file be re-picked after a failure
    if (!files.length) return;
    try {
      // iPhone photos arrive as HEIC; convert to JPEG, fix rotation and shrink
      // them in the browser before uploading.
      const prepared = await prepareImagesForUpload(files);
      const tooBig = prepared.find(f => f.size > MAX_UPLOAD_MB * 1024 * 1024);
      if (tooBig) {
        toast.error(`"${tooBig.name}" is larger than ${MAX_UPLOAD_MB}MB`);
        return;
      }
      const results = await Promise.all(
        prepared.map(file => uploadsAPI.uploadImage(file, 'products'))
      );
      const newUrls = results.map(r => r.data.url);
      setFormData(prev => ({ ...prev, images: [...(prev.images || []), ...newUrls].slice(0, 5) }));
      toast.success('Images uploaded');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Image upload failed');
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // The API expects the image list as `image_urls`.
      const payload = { ...formData, image_urls: formData.images || [] };
      if (isEditing) {
        await productsAPI.update(id, payload);
        toast.success('Product updated');
      } else {
        await productsAPI.create(payload);
        toast.success('Product created');
      }
      navigate('/farmer/products');
    } catch (err) {
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader className="animate-spin" /></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{isEditing ? 'Edit Product' : 'Add New Product'}</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6 border rounded-lg bg-white shadow-sm space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Product Name *</label>
              <input name="name" value={formData.name} onChange={handleChange} required className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select name="category_id" value={formData.category_id} onChange={handleChange} required className="w-full border p-2 rounded">
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description *</label>
            <textarea name="description" value={formData.description} onChange={handleChange} required rows="4" className="w-full border p-2 rounded"></textarea>
          </div>
        </div>

        <div className="card p-6 border rounded-lg bg-white shadow-sm space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Pricing & Inventory</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Price ($) *</label>
              <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} required className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit *</label>
              <select name="unit" value={formData.unit} onChange={handleChange} className="w-full border p-2 rounded">
                {/* Same list the basket-item form uses. Milk, honey, oils and
                    juices had no unit that fitted — the closest was "piece",
                    which prices a litre of honey as one object. */}
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="litre">litre</option>
                <option value="ml">ml</option>
                <option value="lb">lb</option>
                <option value="piece">piece</option>
                <option value="bunch">bunch</option>
                <option value="dozen">dozen</option>
                <option value="packet">packet</option>
                <option value="box">box</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Available Qty *</label>
              <input type="number" name="available_quantity" value={formData.available_quantity} onChange={handleChange} required className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Min Order Qty *</label>
              <input type="number" name="min_quantity" value={formData.min_quantity} onChange={handleChange} required className="w-full border p-2 rounded" />
            </div>
          </div>
        </div>

        <div className="card p-6 border rounded-lg bg-white shadow-sm space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Attributes & Logistics</h2>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" name="is_organic" checked={formData.is_organic} onChange={handleChange} /> Organic Certified</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_natural" checked={formData.is_natural} onChange={handleChange} /> 100% Natural</label>
            {/* Made rather than grown — jam, pickle, ghee, honey, baked goods.
                Not exclusive with the two above: a home-made jam can be organic. */}
            <label className="flex items-center gap-2"><input type="checkbox" name="is_homemade" checked={formData.is_homemade} onChange={handleChange} /> Home made</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="delivery_available" checked={formData.delivery_available} onChange={handleChange} /> Delivery Available</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="pickup_available" checked={formData.pickup_available} onChange={handleChange} /> Pickup Available</label>
            <label className="flex items-center gap-2 font-medium text-blue-600"><input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} /> Active (Visible in store)</label>
          </div>
        </div>

        <div className="card p-6 border rounded-lg bg-white shadow-sm space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Images (Max 5)</h2>
          <div className="flex gap-4 flex-wrap">
            {formData.images?.map((url, i) => (
              <div key={i} className="relative w-24 h-24 border rounded overflow-hidden">
                <img src={mediaUrl(url)} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-white rounded-full p-1 shadow hover:text-red-500"><X size={14}/></button>
              </div>
            ))}
            {(formData.images?.length || 0) < 5 && (
              <label className="w-24 h-24 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 text-gray-500">
                <Upload size={24} />
                <span className="text-xs mt-1">Upload</span>
                <input type="file" accept={IMAGE_ACCEPT} multiple onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate('/farmer/products')} className="px-6 py-2 border rounded hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FarmerProductForm;
