import React, { useEffect, useState } from 'react';
import { mediaUrl } from '../../utils/image'
import { favoritesAPI } from '../../api';
import { Loader, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

const CustomerFavorites = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const type = activeTab === 'products' ? 'product' : 'farmer';
    favoritesAPI.list({ type })
      .then(res => setItems(res.data || []))
      .catch(err => toast.error('Failed to load favorites'))
      .finally(() => setLoading(false));
  }, [activeTab]);

  const toggleFavorite = async (id, type) => {
    try {
      // Favourites are a toggle; there is no dedicated delete endpoint.
      await (type === 'product'
        ? favoritesAPI.toggleProduct(id)
        : favoritesAPI.toggleFarmer(id));
      setItems(items.filter(item => item.id !== id));
      toast.success('Removed from favorites');
    } catch (err) {
      toast.error('Failed to update favorite');
    }
  };

  return (
    <div className="p-6">
      <div className="section-header mb-6">
        <h1 className="text-2xl font-bold">Favorites</h1>
      </div>

      <div className="flex gap-4 mb-6 border-b pb-2">
        <button onClick={() => setActiveTab('products')} className={`px-4 py-2 font-medium ${activeTab === 'products' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Products</button>
        <button onClick={() => setActiveTab('farmers')} className={`px-4 py-2 font-medium ${activeTab === 'farmers' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Farmers</button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader className="animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state text-center p-12 bg-gray-50 rounded-lg">
          <Heart className="empty-state__icon mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium">No favorites yet</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map(item => (
            <div key={item.id} className="card border rounded-lg overflow-hidden relative">
              <button 
                onClick={() => toggleFavorite(item.id, activeTab === 'products' ? 'product' : 'farmer')}
                className="absolute top-2 right-2 p-2 bg-white rounded-full shadow hover:bg-gray-100 z-10"
              >
                <Heart className="text-red-500 fill-current w-5 h-5" />
              </button>
              
              <img src={mediaUrl(item.image_url || '/placeholder.jpg')} alt={item.name} className="w-full h-48 object-cover" />
              
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                {activeTab === 'products' ? (
                  <p className="text-gray-600">${item.price}</p>
                ) : (
                  <p className="text-gray-600 text-sm truncate">{item.bio}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerFavorites;
