import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function MyListings() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', price: '', category: '', condition: '', description: '' });

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (user) fetchMyListings();
  }, [user, authLoading]);

  const fetchMyListings = async () => {
    try {
      const res = await axios.get('https://qcu-marketplace-b08m.onrender.com/api/products/my-listings', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setListings(res.data);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const handleEditClick = (item) => {
    setEditingProduct(item);
    setEditForm({
      title: item.title,
      price: item.price,
      category: item.category || 'Others',
      condition: item.condition || 'New',
      description: item.description
    });
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`https://qcu-marketplace-b08m.onrender.com/api/products/${editingProduct._id}`, editForm, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      toast.success("Listing updated successfully!");
      setEditingProduct(null);
      fetchMyListings(); 
    } catch (error) {
      toast.error("Failed to update listing.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this listing?")) return;
    try {
      await axios.delete(`https://qcu-marketplace-b08m.onrender.com/api/products/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      toast.success("Listing deleted.");
      fetchMyListings(); 
    } catch (error) {
      toast.error("Failed to delete listing.");
    }
  };

  if (authLoading || loading) return <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center text-gray-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#F9F8F6] w-full pb-20 font-sans text-gray-800">
      <Head><title>My Listings | QCU Marketplace</title></Head>
      
      <div className="max-w-[1000px] mx-auto px-6 py-10 w-full">
        <div className="flex justify-between items-end mb-8 border-b border-gray-200 pb-5">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">My Listings</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your active products</p>
          </div>
          <button onClick={() => router.push('/sell')} className="bg-[#8A1C30] text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-sm hover:bg-[#6c1525] transition-colors">
            + New Listing
          </button>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl py-20 flex flex-col items-center justify-center shadow-sm">
            <div className="text-4xl opacity-30 mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-800 mb-1">No listings found</h3>
            <p className="text-sm text-gray-500 mb-6">Start selling to the QCU community!</p>
            <button onClick={() => router.push('/sell')} className="bg-[#8A1C30] text-white px-6 py-2.5 rounded-full text-sm font-medium shadow-sm hover:bg-[#6c1525] transition-colors">
              Post an Item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {listings.map((item) => (
              <div key={item._id} className="bg-white border border-gray-200 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-5 shadow-sm hover:shadow-md transition-all">
                
                <div className="w-full md:w-20 h-20 rounded-xl bg-gray-50 overflow-hidden shrink-0 flex items-center justify-center border border-gray-100">
                  {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400">No Image</span>}
                </div>
                
                <div className="flex-1 w-full">
                  <div className="flex gap-2 mb-1.5">
                     <span className="bg-red-50 text-[#8A1C30] px-2.5 py-1 rounded text-xs font-medium">{item.category}</span>
                     <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded text-xs font-medium">{item.status || 'Active'}</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 text-base">{item.title}</h4>
                  <p className="text-lg font-bold text-[#8A1C30] mt-1">₱{item.price}</p>
                </div>

                <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0 border-t border-gray-100 md:border-none pt-4 md:pt-0">
                  <button onClick={() => handleEditClick(item)} className="flex-1 md:flex-none bg-white text-gray-600 border border-gray-200 px-5 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 hover:text-gray-800 transition-colors">Edit</button>
                  <button onClick={() => handleDelete(item._id)} className="flex-1 md:flex-none bg-white text-red-500 border border-red-100 px-5 py-2 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingProduct && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[500px] overflow-hidden p-6 animate-fadeInUp">
             <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-3">
               <h3 className="font-semibold text-gray-800 text-lg">Edit Listing</h3>
               <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
             </div>
             
             <form onSubmit={handleUpdateSubmit} className="space-y-4">
                <div>
                   <label className="text-xs text-gray-600 mb-1 block">Product Title</label>
                   <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3 text-sm outline-none focus:border-[#8A1C30]" required />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-xs text-gray-600 mb-1 block">Price (₱)</label>
                      <input type="number" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3 text-sm outline-none focus:border-[#8A1C30]" required />
                   </div>
                   <div>
                      <label className="text-xs text-gray-600 mb-1 block">Condition</label>
                      <select value={editForm.condition} onChange={e => setEditForm({...editForm, condition: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3 text-sm outline-none focus:border-[#8A1C30]">
                          <option>New</option><option>Like New</option><option>Used - Good</option><option>Used - Fair</option>
                      </select>
                   </div>
                </div>

                <div>
                   <label className="text-xs text-gray-600 mb-1 block">Category</label>
                   <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3 text-sm outline-none focus:border-[#8A1C30]">
                       <option>Books</option><option>Electronics</option><option>Clothing</option><option>Food</option><option>Services</option><option>Others</option>
                   </select>
                </div>

                <div>
                   <label className="text-xs text-gray-600 mb-1 block">Description</label>
                   <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3 text-sm outline-none focus:border-[#8A1C30] h-24 resize-none" required></textarea>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 bg-white text-gray-600 border border-gray-200 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 bg-[#8A1C30] text-white py-2.5 rounded-lg text-sm font-medium shadow-sm hover:bg-[#6c1525] transition-colors">Save Changes</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}