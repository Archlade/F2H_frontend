import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import toast from 'react-hot-toast';

export default function AdminFeaturedContent() {
  const [featuredFarmers, setFeaturedFarmers] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [farmerIds, setFarmerIds] = useState('');
  const [productIds, setProductIds] = useState('');

  useEffect(() => {
    fetchFeatured();
  }, []);

  const fetchFeatured = async () => {
    setLoading(true);
    try {
      const [farmersRes, productsRes] = await Promise.all([
        adminAPI.getFeaturedFarmers(),
        adminAPI.getFeaturedProducts()
      ]);
      setFeaturedFarmers(farmersRes.data || farmersRes);
      setFeaturedProducts(productsRes.data || productsRes);
    } catch (err) {
      toast.error('Failed to load featured content');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFarmers = async (e) => {
    e.preventDefault();
    try {
      const ids = farmerIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      await adminAPI.setFeaturedFarmers({ farmer_ids: ids });
      toast.success('Featured farmers updated');
      fetchFeatured();
    } catch (err) {
      toast.error('Failed to update featured farmers');
    }
  };

  const handleUpdateProducts = async (e) => {
    e.preventDefault();
    try {
      const ids = productIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      await adminAPI.setFeaturedProducts({ product_ids: ids });
      toast.success('Featured products updated');
      fetchFeatured();
    } catch (err) {
      toast.error('Failed to update featured products');
    }
  };

  if (loading) return <div className="spinner">Loading...</div>;

  return (
    <div className="admin-featured-content">
      <div className="card mb-4">
        <div className="card-header">
          <h2>Featured Farmers</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleUpdateFarmers} className="mb-4">
            <div className="form-group">
              <label className="form-label">Comma separated Farmer IDs</label>
              <input type="text" className="form-input" value={farmerIds} onChange={e => setFarmerIds(e.target.value)} />
            </div>
            <button className="btn btn-primary touch-target" type="submit">Update Featured Farmers</button>
          </form>
          <ul>
            {featuredFarmers.map(f => <li key={f.id}>{f.name} (ID: {f.id})</li>)}
          </ul>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h2>Featured Products</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleUpdateProducts} className="mb-4">
            <div className="form-group">
              <label className="form-label">Comma separated Product IDs</label>
              <input type="text" className="form-input" value={productIds} onChange={e => setProductIds(e.target.value)} />
            </div>
            <button className="btn btn-primary touch-target" type="submit">Update Featured Products</button>
          </form>
          <ul>
            {featuredProducts.map(p => <li key={p.id}>{p.name} (ID: {p.id})</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
