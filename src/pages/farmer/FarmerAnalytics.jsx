import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Loader, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { farmersAPI } from '../../api';

/**
 * The farmer's own numbers.
 *
 * This page used to render two hardcoded arrays — a Jan–Jun line and a bar
 * chart of Tomatoes, Potatoes, Carrots and Apples — identical for every farmer,
 * behind a `setTimeout` pretending to load. It called no API at all.
 *
 * That is worse than an empty page: a chart is read as fact, and somebody could
 * plan a season around numbers that were never theirs. Both series now come
 * from this farmer's own orders, and when there is nothing to show the page
 * says so instead of drawing something.
 */

const rupees = (n) => `₹${Number(n || 0).toFixed(2)}`;

const FarmerAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    farmersAPI.getDashboardAnalytics()
      .then(res => setData(res.data))
      .catch(() => toast.error('Could not load your analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader className="animate-spin" /></div>;
  }

  const monthly = data?.monthly || [];
  const topProducts = data?.top_products || [];
  // A farmer with no orders yet gets six zeroes, which draws a flat line along
  // the axis and reads as a broken chart rather than an empty one.
  const hasOrders = monthly.some(m => m.orders > 0);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics &amp; Insights</h1>

      {!hasOrders && topProducts.length === 0 ? (
        <div className="card" style={{ padding: 48, borderRadius: 'var(--radius-xl)', textAlign: 'center' }}>
          <BarChart2 size={40} className="text-muted" style={{ margin: '0 auto 14px' }} />
          <h2 className="text-h3" style={{ marginBottom: 6 }}>No orders yet</h2>
          <p className="text-sm text-muted">
            Once customers start ordering, your monthly trend and best sellers appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card p-6 bg-white border rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-1 text-gray-800">Orders per month</h2>
            <p className="text-sm text-muted mb-6">The last six months, including months with none.</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-100)" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value, name) =>
                      name === 'revenue' ? [rupees(value), 'Revenue'] : [value, 'Orders']}
                  />
                  <Line
                    type="monotone" dataKey="orders" name="orders"
                    stroke="var(--color-primary-600)" strokeWidth={2}
                    dot={{ r: 3 }} activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-6 bg-white border rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-1 text-gray-800">Revenue per month</h2>
            <p className="text-sm text-muted mb-6">Completed orders only — money actually collected.</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-100)" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [rupees(value), 'Revenue']} />
                  <Bar dataKey="revenue" fill="var(--color-primary-500)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {topProducts.length > 0 && (
            <div className="card p-6 bg-white border rounded-lg shadow-sm lg:col-span-2">
              <h2 className="text-lg font-semibold mb-1 text-gray-800">Your best sellers</h2>
              <p className="text-sm text-muted mb-6">By number of orders, all time.</p>
              <div style={{ height: Math.max(160, topProducts.length * 48) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-100)" />
                    <XAxis type="number" allowDecimals={false} />
                    {/* Wide enough for a real product name — the default clips
                        anything past a few characters. */}
                    <YAxis type="category" dataKey="name" width={140} />
                    <Tooltip
                      formatter={(value, name) =>
                        name === 'revenue' ? [rupees(value), 'Revenue'] : [value, 'Orders']}
                    />
                    <Bar dataKey="orders" name="orders" fill="var(--color-primary-500)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FarmerAnalytics;
