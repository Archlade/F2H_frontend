import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader } from 'lucide-react';

const FarmerAnalytics = () => {
  const [loading, setLoading] = useState(true);
  
  const mockLineData = [
    { name: 'Jan', requests: 40 }, { name: 'Feb', requests: 30 },
    { name: 'Mar', requests: 55 }, { name: 'Apr', requests: 45 },
    { name: 'May', requests: 70 }, { name: 'Jun', requests: 65 },
  ];
  const mockBarData = [
    { name: 'Tomatoes', views: 120 }, { name: 'Potatoes', views: 98 },
    { name: 'Carrots', views: 86 }, { name: 'Apples', views: 150 },
  ];

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) return <div className="p-12 flex justify-center"><Loader className="animate-spin" /></div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics & Insights</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card p-6 bg-white border rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-6 text-gray-800">Monthly Requests Trend</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockLineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="requests" stroke="#16A34A" strokeWidth={3} dot={{r:4, fill:'#16A34A'}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6 bg-white border rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-6 text-gray-800">Top Products by Views</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockBarData} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#374151', fontWeight: 500}} />
                <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="views" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerAnalytics;
