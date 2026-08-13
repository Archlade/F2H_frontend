import React, { useEffect, useState } from 'react';
import { mediaUrl } from '../../utils/image'
import { productsAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Loader, Plus, Edit, Trash2, Package, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const FarmerProducts = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const res = await productsAPI.list({ farmer_id: user.id });
      setProducts(res.data?.items || res.data || []);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchProducts();
  }, [user]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await productsAPI.delete(id);
      toast.success('Product deleted');
      setProducts(products.filter(p => p.id !== id));
    } catch {
      toast.error('Failed to delete product');
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      await productsAPI.update(id, { is_active: !currentStatus });
      toast.success('Status updated');
      fetchProducts();
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div className="flex-between flex-wrap gap-3" style={{ marginBottom: 28 }}>
        <div>
          <h1 className="text-h3" style={{ marginBottom: 4 }}>My Products</h1>
          <p className="text-sm text-muted">{products.length} product{products.length !== 1 ? 's' : ''} listed</p>
        </div>
        <Link to="/farmer/products/new" className="btn btn-primary touch-target">
          <Plus size={16} /> Add Product
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-center" style={{ padding: '80px 0' }}>
          <Loader className="animate-spin" style={{ width: 32, height: 32, color: 'var(--color-primary-600)' }} />
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Package size={28} /></div>
          <h3>No products yet</h3>
          <p>Start listing your fresh farm products to reach customers near you.</p>
          <Link to="/farmer/products/new" className="btn btn-primary touch-target" style={{ marginTop: 8 }}>
            <Plus size={16} /> Add Your First Product
          </Link>
        </div>
      ) : (
        <div className="farmer-product-grid">
          {products.map(product => (
            <div key={product.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Image */}
              <div style={{ position: 'relative', aspectRatio: '4/3', background: 'var(--color-gray-100)', overflow: 'hidden' }}>
                {product.images?.[0]?.image_url || product.primary_image ? (
                  <img
                    src={mediaUrl(product.images?.[0]?.image_url || product.primary_image || '/placeholder.jpg')}
                    alt={product.name}
                    className="farmer-product-card-image"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gray-300)' }}>
                    <Package size={40} />
                  </div>
                )}
                <div style={{ position: 'absolute', top: 8, right: 8 }}>
                  <span className={`badge ${product.is_active ? 'badge-success' : 'badge-gray'}`}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <h3 className="font-semibold" style={{ fontSize: '0.9375rem', marginBottom: 2, lineHeight: 1.3 }}>{product.name}</h3>
                  <p className="text-sm text-muted">{product.category?.name}</p>
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.0625rem', color: 'var(--color-gray-900)' }}>
                  ₹{product.effective_price || product.price}
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-gray-500)', marginLeft: 2 }}>/ {product.unit}</span>
                </div>
                <div className="text-xs text-muted">
                  Stock: {product.available_quantity} {product.unit}
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--color-gray-100)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <Link to={`/farmer/products/${product.id}/edit`} className="btn btn-secondary btn-sm touch-target flex-1">
                  <Edit size={14} /> Edit
                </Link>
                <button
                  onClick={() => toggleActive(product.id, product.is_active)}
                  className="btn btn-ghost btn-sm touch-target"
                  title={product.is_active ? 'Deactivate' : 'Activate'}
                  style={{ color: product.is_active ? 'var(--color-gray-500)' : 'var(--color-primary-600)' }}
                >
                  {product.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="btn btn-ghost btn-sm touch-target"
                  style={{ color: 'var(--color-error)' }}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FarmerProducts;
