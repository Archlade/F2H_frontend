import React, { useEffect, useState } from 'react';
import { productsAPI, toList } from '../../api';
import { Loader, Edit2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const FarmerInventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal] = useState('');

  const fetchInventory = async () => {
    try {
      const res = await productsAPI.list(); 
      setProducts(toList(res.data));
    } catch (err) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleSave = async (id) => {
    // `Number('')` is 0, not NaN.
    //
    // So clearing the box and hitting save silently set the product's stock to
    // zero — which delists it from the shop and cancels nothing, it just stops
    // selling. A farmer who meant to retype a number and mistyped instead lost
    // the listing with a cheerful "Inventory updated" toast.
    const raw = String(editVal).trim();
    const qty = Number(raw);

    if (raw === '' || Number.isNaN(qty)) {
      toast.error('Enter a quantity');
      return;
    }
    if (qty < 0) {
      toast.error('Quantity cannot be negative');
      return;
    }

    try {
      await productsAPI.update(id, { available_quantity: qty });
      toast.success(qty === 0 ? 'Marked out of stock' : 'Inventory updated');
      setProducts(products.map(p => p.id === id ? { ...p, available_quantity: qty } : p));
      setEditingId(null);
    } catch (err) {
      // The server's message, not a generic one — it knows things the form
      // does not, such as stock already committed to a confirmed order.
      toast.error(err.response?.data?.error || 'Failed to update');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Inventory Management</h1>

      {loading ? (
        <div className="flex justify-center p-12"><Loader className="animate-spin" /></div>
      ) : (
        <div className="data-table-wrap bg-white rounded-lg border shadow-sm">
          <table className="data-table w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-4">Product Name</th>
                <th className="p-4">Unit</th>
                <th className="p-4">Threshold</th>
                <th className="p-4">Stock Status</th>
                <th className="p-4 w-48">Available Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map(p => {
                const isLow = p.available_quantity <= p.low_stock_threshold;
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium" data-label="Product Name">{p.name}</td>
                    <td className="p-4 text-gray-500" data-label="Unit">{p.unit}</td>
                    <td className="p-4 text-gray-500" data-label="Threshold">{p.low_stock_threshold}</td>
                    <td className="p-4" data-label="Stock Status">
                      {isLow ? (
                        <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 font-medium">Low Stock</span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 font-medium">In Stock</span>
                      )}
                    </td>
                    <td className="p-4" data-label="Available Qty">
                      {editingId === p.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={editVal}
                            onChange={e => setEditVal(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSave(p.id)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            className="w-20 border rounded p-1 text-sm touch-target"
                            autoFocus
                          />
                          <button onClick={() => handleSave(p.id)} className="text-green-600 p-1 hover:bg-green-50 rounded touch-target"><Check size={18}/></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className={`font-bold ${isLow ? 'text-red-600' : ''}`}>{p.available_quantity}</span>
                          <button onClick={() => { setEditingId(p.id); setEditVal(p.available_quantity); }} className="text-gray-400 hover:text-blue-600 touch-target"><Edit2 size={16}/></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FarmerInventory;
