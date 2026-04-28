import Head from 'next/head';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function SellItem() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'Books',
    condition: 'Good',
    image: ''
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        return toast.error("File size must be less than 5MB");
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setImagePreview(reader.result); 
        setFormData({ ...formData, image: reader.result }); 
      };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return toast.error("Please login to sell an item.");
    if (!formData.image) return toast.error("Please upload a product image.");
    
    setLoading(true);
    try {
      await axios.post('https://qcu-marketplace-b08m.onrender.com/api/products', formData, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      toast.success("Item successfully posted!");
      router.push('/dashboard'); 
    } catch (error) {
      toast.error("Failed to list item.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] py-10 font-sans">
      <Head><title>Sell an Item | QCU Marketplace</title></Head>
      <div className="max-w-2xl mx-auto px-4">
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-[#800000] p-6 text-white flex items-center gap-4">
            <div className="bg-[#FFD700] p-2 rounded-lg">
              <svg className="w-6 h-6 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            </div>
            <div>
              <h1 className="font-bold text-lg">Sell an Item</h1>
              <p className="text-xs text-white/80">List your product for the QCU community</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">Product Image <span className="text-red-500">*</span></label>
              <label className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer relative overflow-hidden min-h-[160px]">
                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} required />
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover absolute inset-0" />
                ) : (
                  <div className="flex flex-col items-center p-10">
                    <svg className="w-8 h-8 mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                    <span className="text-sm font-semibold text-gray-600">Click to upload image</span>
                    <span className="text-xs font-medium mt-1">PNG, JPG up to 5MB</span>
                  </div>
                )}
              </label>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">Title <span className="text-red-500">*</span></label>
              <input type="text" placeholder="What are you selling?" className="w-full border border-gray-200 rounded-lg py-2.5 px-4 text-sm focus:border-gray-400 outline-none" required onChange={(e) => setFormData({...formData, title: e.target.value})} />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">Description</label>
              <textarea rows="4" placeholder="Describe your item (condition, size, usage...)" className="w-full border border-gray-200 rounded-lg py-2.5 px-4 text-sm focus:border-gray-400 outline-none resize-none" onChange={(e) => setFormData({...formData, description: e.target.value})}></textarea>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-2">Price (PHP) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-2.5 text-gray-500 font-bold text-sm">₱</span>
                  <input type="number" placeholder="0.00" className="w-full border border-gray-200 rounded-lg py-2.5 pl-8 pr-4 text-sm focus:border-gray-400 outline-none" required onChange={(e) => setFormData({...formData, price: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-2">Category <span className="text-red-500">*</span></label>
                <select className="w-full border border-gray-200 rounded-lg py-2.5 px-4 text-sm focus:border-gray-400 outline-none" onChange={(e) => setFormData({...formData, category: e.target.value})}>
                  <option>Books</option><option>Electronics</option><option>Clothing</option><option>Food</option><option>Services</option><option>Others</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">Condition</label>
              <select className="w-full border border-gray-200 rounded-lg py-2.5 px-4 text-sm focus:border-gray-400 outline-none" onChange={(e) => setFormData({...formData, condition: e.target.value})}>
                <option>New</option><option>Like New</option><option>Good</option><option>Fair</option>
              </select>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-[#800000] text-white font-bold py-3.5 rounded-lg hover:bg-[#600000] transition-colors shadow-md text-sm">
              {loading ? 'Posting...' : 'Post Item'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}