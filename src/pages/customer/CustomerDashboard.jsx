import React, { useEffect, useState } from 'react';
import ServiceReviewForm from '../../components/ServiceReviewForm';
import { mediaUrl } from '../../utils/image'
import { customersAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { ShoppingBag, Heart, Loader, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customersAPI.dashboard()
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => { toast.error('Failed to load dashboard'); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <Loader className="animate-spin" style={{ width: 32, height: 32, color: 'var(--color-primary-600)' }} />
    </div>
  );

  const statCards = [
    { label: 'Active Requests', value: data?.active_requests_count || 0, icon: ShoppingBag, color: '#dbeafe', iconColor: '#2563eb' },
    { label: 'Saved Products', value: data?.saved_products_count || 0, icon: Heart, color: '#fee2e2', iconColor: '#dc2626' },
  ];

  return (
    <div style={{ padding: '24px 0' }}>
      <div className="dashboard-header" style={{ marginBottom: 28 }}>
        <h1 className="text-h3" style={{ marginBottom: 4 }}>Welcome back, {user?.full_name || 'Customer'}!</h1>
        <p className="text-sm text-muted">Here is an overview of your activity and saved items.</p>
      </div>
      
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        {statCards.map(({ label, value, icon: Icon, color, iconColor }) => (
          <div key={label} className="stat-card">
            <div className="stat-card__icon" style={{ background: color }}>
              <Icon size={20} color={iconColor} />
            </div>
            <div>
              <div className="stat-card__label">{label}</div>
              <div className="stat-card__value">{value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: 24 }}>
        <div className="card">
          <div className="card-header">
            <h2 className="text-h4">Recent Requests</h2>
            <Link to="/dashboard/requests" className="btn btn-ghost btn-sm text-sm flex items-center gap-1" style={{ color: 'var(--color-primary-600)' }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {data?.recent_requests?.length ? (
              <ul style={{ listStyle: 'none' }}>
                {data.recent_requests.map(req => (
                  <li key={req.id} className="flex-between" style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-gray-50)' }}>
                    <div>
                      <p className="font-semibold text-dark" style={{ fontSize: '0.9375rem', marginBottom: 2 }}>{req.product_name}</p>
                      <p className="text-xs text-muted">{new Date(req.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`badge status-${req.status} capitalize`}>{req.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-state__icon"><ShoppingBag size={22} /></div>
                <p>No recent requests found</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-h4">Recently Viewed</h2>
          </div>
          <div className="card-body" style={{ padding: '16px' }}>
            {data?.recently_viewed?.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {data.recently_viewed.map(prod => (
                  <Link key={prod.id} to={`/products/${prod.id}`} className="product-card" style={{ textDecoration: 'none' }}>
                    <img src={mediaUrl(prod.image_url || '/placeholder.jpg')} alt={prod.name} style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                    <div style={{ padding: 8 }}>
                      <h3 className="font-semibold truncate" style={{ fontSize: '0.875rem', color: 'var(--color-gray-900)' }}>{prod.name}</h3>
                      <p className="text-xs font-bold" style={{ color: 'var(--color-primary-600)' }}>₹{prod.price}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '30px 20px' }}>
                <div className="empty-state__icon"><Heart size={22} /></div>
                <p>No products viewed yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Last on the page on purpose. Somebody arrives here to check an order,
          not to review us; asking before they have found what they came for is
          how a feedback box gets ignored. */}
      <div style={{ marginTop: 24, maxWidth: 640 }}>
        <ServiceReviewForm />
      </div>
    </div>
  );
};

export default CustomerDashboard;
