import React, { useEffect, useState } from 'react';
import { farmersAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Package, ShoppingCart, IndianRupee, AlertTriangle, Loader, Plus, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import ServiceReviewForm from '../../components/ServiceReviewForm';

const FarmerDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    farmersAPI.getDashboardStats()
      .then(res => setStats(res.data))
      .catch(() => toast.error('Failed to load dashboard stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="dashboard-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <Loader className="animate-spin" style={{ width: 32, height: 32, color: 'var(--color-primary-600)' }} />
    </div>
  );

  const statCards = [
    { label: 'Total Products', value: stats?.total_products || 0, icon: Package, color: '#dbeafe', iconColor: '#2563eb' },
    { label: 'Pending Requests', value: stats?.pending_requests || 0, icon: ShoppingCart, color: '#fef3c7', iconColor: '#d97706' },
    { label: 'Total Revenue', value: `₹${Number(stats?.total_revenue || 0).toLocaleString()}`, icon: IndianRupee, color: 'var(--color-primary-100)', iconColor: 'var(--color-primary-700)' },
    { label: 'Low Stock', value: stats?.low_stock_products || 0, icon: AlertTriangle, color: '#fee2e2', iconColor: '#dc2626' },
  ];

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Page Header */}
      <div className="dashboard-header flex-between flex-wrap gap-3" style={{ marginBottom: 28 }}>
        <div>
          <h1 className="text-h3" style={{ marginBottom: 4 }}>Farmer Dashboard</h1>
          <p className="text-sm text-muted">Welcome back, {user?.full_name || 'Farmer'}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link to="/farmer/products/new" className="btn btn-primary touch-target">
            <Plus size={16} /> Add Product
          </Link>
          <Link to="/farmer/requests" className="btn btn-secondary touch-target">
            View Requests
          </Link>
        </div>
      </div>

      {/* Stats Grid — horizontal scroll on mobile */}
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

      {/* Content Grid */}
      <div className="grid-2" style={{ gap: 24 }}>
        {/* Recent Requests */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-h4">Recent Requests</h2>
            <Link to="/farmer/requests" className="btn btn-ghost btn-sm text-sm flex items-center gap-1" style={{ color: 'var(--color-primary-600)' }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {stats?.recent_requests?.length > 0 ? (
              <ul style={{ listStyle: 'none' }}>
                {stats.recent_requests.map(req => (
                  <li key={req.id} className="flex-between" style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-gray-50)' }}>
                    <div>
                      <p className="font-semibold text-dark" style={{ fontSize: '0.9375rem', marginBottom: 2 }}>{req.product_name}</p>
                      <p className="text-sm text-muted">Qty: {req.quantity}</p>
                    </div>
                    <span className={`badge status-${req.status} capitalize`}>{req.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-state__icon"><ShoppingCart size={22} /></div>
                <p>No recent requests</p>
              </div>
            )}
          </div>
        </div>

        {/* Inventory Alerts */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-h4">Inventory Alerts</h2>
            <Link to="/farmer/inventory" className="btn btn-ghost btn-sm text-sm flex items-center gap-1" style={{ color: 'var(--color-primary-600)' }}>
              Manage <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {stats?.inventory_alerts?.length > 0 ? (
              <ul style={{ listStyle: 'none' }}>
                {stats.inventory_alerts.map(item => (
                  <li key={item.id} className="flex-between" style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-gray-50)' }}>
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={18} color="var(--color-error)" />
                      <span className="font-semibold">{item.name}</span>
                    </div>
                    <span className="badge badge-error">{item.available_quantity} left</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-state__icon"><Package size={22} /></div>
                <p style={{ color: 'var(--color-success)' }}>All stock levels are good!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Last on the page, as on the customer dashboard. A farmer opens this
          to check requests and stock, not to review us; asking before they
          have found what they came for is how a feedback box gets ignored. */}
      <div style={{ marginTop: 24, maxWidth: 640 }}>
        <ServiceReviewForm />
      </div>
    </div>
  );
};

export default FarmerDashboard;
