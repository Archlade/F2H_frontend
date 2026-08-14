import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../api';
import {
  Users, Tractor, Package, ShoppingCart, CheckCircle, AlertTriangle,
  DollarSign, Loader, BadgeCheck, Star, Boxes, ArrowRight, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async ({ quiet = false } = {}) => {
    if (!quiet) setRefreshing(true);
    try {
      const res = await adminAPI.dashboard();
      setData(res.data || res);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchDashboard({ quiet: true }); }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <Loader className="animate-spin" style={{ width: 32, height: 32, color: 'var(--color-primary-600)' }} />
    </div>
  );

  if (!data) return <div className="empty-state">No data available</div>;

  const statCards = [
    { label: 'Total Revenue', value: money(data.total_revenue), icon: DollarSign, color: '#ffedd5', iconColor: '#ea580c' },
    { label: 'Total Users', value: data.total_users || 0, icon: Users, color: '#dbeafe', iconColor: '#2563eb' },
    { label: 'Total Farmers', value: data.total_farmers || 0, icon: Tractor, color: '#dcfce7', iconColor: '#16a34a' },
    { label: 'Total Products', value: data.total_products || 0, icon: Package, color: '#fef3c7', iconColor: '#d97706' },
    { label: 'Active Orders', value: data.active_requests || 0, icon: ShoppingCart, color: '#ede9fe', iconColor: '#7c3aed' },
    { label: 'Completed Orders', value: data.completed_orders || 0, icon: CheckCircle, color: '#d1fae5', iconColor: '#059669' },
  ];

  // Everything an admin is actually expected to act on. Zero-count queues are
  // dropped rather than shown as empty rows, so this list is a to-do list.
  const queues = [
    { label: 'requests awaiting review', count: data.pending_requests, to: '/admin/requests', icon: ShoppingCart },
    { label: 'farms awaiting verification', count: data.pending_farmers, to: '/admin/farmers', icon: BadgeCheck },
    { label: 'products awaiting approval', count: data.pending_products, to: '/admin/products', icon: Package },
    // Weekly baskets waiting on an admin, not curated packs — the packs
    // feature is gone and its screen with it.
    { label: 'baskets awaiting approval', count: data.pending_baskets, to: '/admin/baskets', icon: Boxes },
    { label: 'reviews awaiting approval', count: data.pending_reviews, to: '/admin/reviews', icon: Star },
    { label: 'reports to resolve', count: data.pending_reports, to: '/admin/reports', icon: AlertTriangle },
  ].filter((q) => Number(q.count) > 0);

  const split = [
    { label: 'Product orders', value: data.product_revenue },
    { label: 'Weekly baskets', value: data.basket_revenue },
  ];
  const splitTotal = split.reduce((s, r) => s + Number(r.value || 0), 0);

  return (
    <div style={{ padding: '24px 0' }}>
      <div className="dashboard-header"
        style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 className="text-h3" style={{ marginBottom: 4 }}>Admin Dashboard</h1>
          <p className="text-sm text-muted">Platform metrics and system status overview.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => fetchDashboard()} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'spin' : undefined} /> Refresh
        </button>
      </div>

      <div className="stats-grid">
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginTop: 28 }}>
        {/* Needs attention */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-h4">Needs your attention</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {queues.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
                <CheckCircle size={18} color="var(--color-primary-600)" />
                <span className="text-sm text-muted">Nothing waiting — every queue is clear.</span>
              </div>
            ) : queues.map(({ label, count, to, icon: Icon }) => (
              <Link key={to} to={to} className="admin-queue-row">
                <Icon size={16} style={{ flexShrink: 0, color: 'var(--color-gray-500)' }} />
                <span style={{ flex: 1 }}>
                  <strong>{count}</strong> {label}
                </span>
                <ArrowRight size={15} style={{ flexShrink: 0, color: 'var(--color-gray-400)' }} />
              </Link>
            ))}
          </div>
        </div>

        {/* Where the money comes from */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-h4">Revenue by order type</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {splitTotal === 0 ? (
              <span className="text-sm text-muted">No completed orders yet.</span>
            ) : split.map(({ label, value }) => {
              const pct = Math.round((Number(value || 0) / splitTotal) * 100);
              return (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="text-sm">{label}</span>
                    <span className="text-sm" style={{ fontWeight: 600 }}>{money(value)} · {pct}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: 'var(--color-gray-100)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-primary-500)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
