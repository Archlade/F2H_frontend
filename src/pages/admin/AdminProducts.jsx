import React, { useState, useEffect } from 'react';
import { adminAPI, toList } from '../../api';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    fetchProducts();
  }, [debouncedSearch, page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.products({ search: debouncedSearch, page });
      setProducts(toList(res.data));
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await adminAPI.approveProduct(id);
      toast.success('Product approved');
      fetchProducts();
    } catch (err) {
      toast.error('Failed to approve product');
    }
  };

  const handleFeature = async (id) => {
    try {
      await adminAPI.featureProduct(id);
      toast.success('Product feature toggled');
      fetchProducts();
    } catch (err) {
      toast.error('Failed to toggle feature');
    }
  };

  /**
   * Add or remove a product from the weekly basket catalogue.
   *
   * Adding is harmless. Removing edits every live basket holding the product
   * and notifies those customers, so it asks first and then reports what it
   * did — an admin should not learn from support messages that one click
   * changed forty people's weekly shop.
   */
  const handleBasket = async (product) => {
    if (product.basket_eligible && !window.confirm(
      `Remove ${product.name} from weekly baskets?\n\n` +
      'It will be taken out of every basket that currently includes it, and ' +
      'those customers will be told. Baskets left with nothing in them are paused.'
    )) return;

    try {
      const { data } = await adminAPI.toggleBasketProduct(product.id);
      if (!data.basket_eligible && data.baskets_affected) {
        toast.success(
          `Removed from ${data.baskets_affected} basket${data.baskets_affected === 1 ? '' : 's'}`
          + (data.baskets_paused ? ` · ${data.baskets_paused} paused (nothing left in them)` : '')
        );
      } else {
        toast.success(data.basket_eligible
          ? `${product.name} is now available for weekly baskets`
          : `${product.name} removed from weekly baskets`);
      }
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not update the basket catalogue');
    }
  };

  return (
    <div className="admin-products card">
      <div className="card-header flex-between flex-wrap gap-3">
        <h2 className="text-h3">Products</h2>
        <div className="input-icon-wrap" style={{ minWidth: 240 }}>
          <Search size={16} className="icon-left" />
          <input
            type="text"
            className="form-input touch-target"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="card-body">
        {loading ? <div className="spinner">Loading...</div> : (
          products.length === 0 ? <div className="empty-state">No products found</div> :
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Farmer</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Featured</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td data-label="Name">{p.name}</td>
                    <td data-label="Farmer">{p.farmer}</td>
                    <td data-label="Category">{p.category}</td>
                    <td data-label="Price">${p.price}</td>
                    <td data-label="Status"><span className={`badge ${p.is_approved ? 'badge-success' : 'badge-warning'}`}>{p.is_approved ? 'Approved' : 'Pending'}</span></td>
                    <td data-label="Featured"><span className={`badge ${p.is_featured ? 'badge-info' : ''}`}>{p.is_featured ? 'Yes' : 'No'}</span></td>
                    <td data-label="Actions">
                      {!p.is_approved && <button className="btn btn-sm btn-primary touch-target" onClick={() => handleApprove(p.id)}>Approve</button>}
                      <button className="btn btn-sm btn-secondary touch-target" onClick={() => handleFeature(p.id)}>Toggle Feature</button>
                      <button
                        className={`btn btn-sm touch-target ${p.basket_eligible ? 'btn-success font-bold' : 'btn-secondary'}`}
                        onClick={() => handleBasket(p)}
                        title={p.basket_eligible
                          ? 'In the weekly basket catalogue — click to remove'
                          : 'Not in the weekly basket catalogue — click to add'}
                      >
                        {p.basket_eligible ? '✓ In baskets' : 'Add to baskets'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination flex flex-between items-center" style={{ marginTop: 20 }}>
              <button className="btn btn-sm btn-secondary touch-target" onClick={() => setPage(pg => Math.max(1, pg - 1))} disabled={page === 1}>Prev</button>
              <span className="text-sm font-semibold">Page {page}</span>
              <button className="btn btn-sm btn-secondary touch-target" onClick={() => setPage(pg => pg + 1)} disabled={products.length < 15}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
