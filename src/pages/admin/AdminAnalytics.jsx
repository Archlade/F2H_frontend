import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await adminAPI.analytics();
      setData(res.data || res);
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="spinner">Loading...</div>;
  if (!data) return <div className="empty-state">No analytics data found</div>;

  return (
    <div className="admin-analytics">
      <h1>Analytics</h1>
      <div className="stats-grid mb-4">
        <div className="stat-card">
          <div className="stat-card__label">New Users (30d)</div>
          <div className="stat-card__value">{data.new_users_30d}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">New Requests (30d)</div>
          <div className="stat-card__value">{data.new_requests_30d}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Revenue (30d)</div>
          <div className="stat-card__value">${data.revenue_30d}</div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h2>Top Categories</h2>
        </div>
        <div className="card-body analytics-chart-wrap">
          {data.top_categories && data.top_categories.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.top_categories}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">No category data available</div>
          )}
        </div>
      </div>
    </div>
  );
}
