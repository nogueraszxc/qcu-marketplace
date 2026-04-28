import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import axios from 'axios';
import Link from 'next/link';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (user) fetchMyListings();
  }, [user, authLoading]);

  const fetchMyListings = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/products/my-listings', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setProducts(res.data);
    } catch (error) {
      console.error("Failed to fetch listings", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center font-medium text-[#8A1C30]">Loading dashboard...</div>;

  const activeCount = products.filter(p => p.status === 'Approved').length;

  return (
    <div className="min-h-screen bg-[#F9F8F6] font-sans pb-20">
      <Head><title>Dashboard | QCU Marketplace</title></Head>

      <div className="max-w-[1200px] mx-auto px-6 py-10 w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, <span className="text-[#8A1C30]">{user?.name?.split(' ')[0] || 'User'}</span> 👋</h1>
        <p className="text-sm text-gray-500 mb-10">Here's your marketplace overview.</p>

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
             <span className="text-2xl mb-2">📦</span>
             <p className="text-3xl font-bold text-gray-800">{products.length}</p>
             <p className="text-xs text-gray-500 font-medium mt-1">My Listings</p>
           </div>
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
             <span className="text-2xl mb-2">📈</span>
             <p className="text-3xl font-bold text-gray-800">{activeCount}</p>
             <p className="text-xs text-gray-500 font-medium mt-1">Active Listings</p>
           </div>
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
             <span className="text-2xl mb-2">🛍️</span>
             <p className="text-3xl font-bold text-gray-800">0</p>
             <p className="text-xs text-gray-500 font-medium mt-1">Purchases Made</p>
           </div>
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
             <span className="text-2xl mb-2">⭐</span>
             <p className="text-3xl font-bold text-gray-800">0</p>
             <p className="text-xs text-gray-500 font-medium mt-1">Items Sold</p>
           </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* MY RECENT LISTINGS */}
          <div className="flex-1">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800">My Recent Listings</h2>
                <Link href="/my-listings" className="text-xs font-medium text-gray-500 hover:text-[#8A1C30]">View All &rarr;</Link>
             </div>
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                {products.slice(0, 3).map(product => (
                  <div key={product._id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden shrink-0">
                           {product.image && <img src={product.image} className="w-full h-full object-cover" alt="product" />}
                        </div>
                        <div>
                           <p className="font-bold text-sm text-gray-800">{product.title}</p>
                           <p className="text-xs font-semibold text-[#8A1C30]">₱{product.price}</p>
                        </div>
                     </div>
                     {/* DYNAMIC STATUS BADGE */}
                     <div>
                        {product.status === 'Approved' ? (
                          <span className="bg-green-50 text-green-600 border border-green-100 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase">Active</span>
                        ) : product.status === 'Rejected' ? (
                          <span className="bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase">Rejected</span>
                        ) : (
                          <span className="bg-orange-50 text-orange-600 border border-orange-100 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase">Pending Approval</span>
                        )}
                     </div>
                  </div>
                ))}
                {products.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-4">You haven't posted any items yet.</p>
                )}
             </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="w-full md:w-[350px]">
             <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <Link href="/sell" className="flex items-center justify-between p-5 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                   <div className="flex items-center gap-3"><span className="text-[#8A1C30] font-bold text-lg">+</span><span className="text-sm font-medium text-gray-700">Sell an Item</span></div>
                   <span className="text-gray-300">&gt;</span>
                </Link>
                <Link href="/transactions" className="flex items-center justify-between p-5 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                   <div className="flex items-center gap-3"><span className="text-[#8A1C30] font-bold text-lg">🔄</span><span className="text-sm font-medium text-gray-700">My Transactions</span></div>
                   <span className="text-gray-300">&gt;</span>
                </Link>
                <Link href="/browse" className="flex items-center justify-between p-5 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                   <div className="flex items-center gap-3"><span className="text-[#8A1C30] font-bold text-lg">🛒</span><span className="text-sm font-medium text-gray-700">Browse Products</span></div>
                   <span className="text-gray-300">&gt;</span>
                </Link>
                <Link href="/profile" className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                   <div className="flex items-center gap-3"><span className="text-[#8A1C30] font-bold text-lg">👤</span><span className="text-sm font-medium text-gray-700">My Profile</span></div>
                   <span className="text-gray-300">&gt;</span>
                </Link>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}