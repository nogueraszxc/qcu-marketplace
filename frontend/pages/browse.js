import Head from 'next/head';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';

export default function Browse() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  const categories = ['All', 'Books', 'Electronics', 'Clothing', 'Food', 'Services', 'Others'];

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/products'); 
      setProducts(res.data);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || p.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#F9F8F6] w-full flex flex-col font-sans text-gray-800 pb-20">
      <Head><title>Browse | QCU Marketplace</title></Head>

      <div className="bg-[#8A1C30] w-full pt-16 pb-20 px-6">
        <div className="max-w-[800px] mx-auto text-center flex flex-col items-center">
          <span className="text-[#E6B93D] font-medium text-xs border border-[#E6B93D]/40 px-4 py-1 rounded-full mb-5">
            QCU Community Marketplace
          </span>
          <h1 className="text-3xl md:text-5xl font-semibold text-white leading-tight mb-4">
            Buy & Sell Within <span className="text-[#E6B93D]">QCU Campus</span>
          </h1>
          <p className="text-sm md:text-base text-white/80 font-normal max-w-md mx-auto mb-8">
            The trusted marketplace for students and faculty. Find great deals or sell items safely.
          </p>

          <div className="w-full max-w-[500px] relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search products..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white rounded-full py-3.5 pl-12 pr-24 text-sm font-normal text-gray-800 outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 sticky top-[68px] z-40">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center justify-center gap-3 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`whitespace-nowrap px-5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                category === cat 
                  ? 'bg-[#8A1C30] text-white border-[#8A1C30]' 
                  : 'bg-transparent text-gray-600 border-gray-200 hover:border-[#8A1C30] hover:text-[#8A1C30]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-10 w-full flex-1">
        <div className="flex justify-between items-end mb-6">
           <h2 className="text-xl font-semibold text-gray-800">
             {search ? `Results for "${search}"` : `${category} Products`}
           </h2>
           <p className="text-sm text-gray-500">{filteredProducts.length} items</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">Loading items...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h3 className="text-lg font-medium text-gray-600">No products found</h3>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {filteredProducts.map((product) => (
              <div 
                key={product._id} 
                onClick={() => {
                  if (user && product.sellerId === user._id) {
                    router.push('/my-listings');
                  } else {
                    router.push(`/product/${product._id}`);
                  }
                }} 
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col"
              >
                <div className="aspect-square bg-gray-50 relative">
                  {product.image ? (
                    <img src={product.image} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                  )}
                  <span className="absolute top-2 left-2 bg-white/90 text-[#8A1C30] text-xs font-medium px-2 py-0.5 rounded-md shadow-sm">
                    {product.category}
                  </span>
                </div>
                
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="text-sm font-medium text-gray-800 leading-tight mb-2 line-clamp-2">
                    {product.title}
                  </h3>
                  <div className="mt-auto flex items-end justify-between">
                    <p className="text-base font-semibold text-[#8A1C30]">₱{product.price}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[80px]">
                      {product.sellerName?.split(' ')[0]}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}