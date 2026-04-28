import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function ProductDetails() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false); // Bagong state para sa Report
  
  const [buyForm, setBuyForm] = useState({ meetupLocation: '', meetupTime: '', paymentMethod: 'Cash', message: '' });
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [reportMessage, setReportMessage] = useState(''); // State para sa reason ng report
  const chatContainerRef = useRef(null);

  useEffect(() => { if (id) fetchProduct(); }, [id]);

  useEffect(() => {
    let interval;
    if (chatModalOpen && product && user) {
      fetchMessages();
      interval = setInterval(fetchMessages, 3000);
    }
    return () => clearInterval(interval);
  }, [chatModalOpen, product, user]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchProduct = async () => {
    try {
      const res = await axios.get(`https://qcu-marketplace-b08m.onrender.com/api/products/${id}`);
      setProduct(res.data);
    } catch (error) {
      toast.error("Product not found");
      router.push('/browse');
    } finally { setLoading(false); }
  };

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`https://qcu-marketplace-b08m.onrender.com/api/transactions/messages/${product.sellerId}/${product._id}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setMessages(res.data);
    } catch (error) { console.error("Chat error", error); }
  };

  const handleActionClick = (action) => {
    if (!user) {
      toast.error("Please login first.");
      router.push('/login');
      return;
    }
    if (action === 'buy') setBuyModalOpen(true);
    if (action === 'chat') setChatModalOpen(true);
    if (action === 'report') setReportModalOpen(true);
  };

  const handleBuySubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://qcu-marketplace-b08m.onrender.com/api/transactions/buy-request', {
        ...buyForm,
        productId: product._id,
        productTitle: product.title,
        price: product.price,
        sellerId: product.sellerId,
        sellerName: product.sellerName
      }, { headers: { Authorization: `Bearer ${user.token}` } });
      toast.success("Transaction request sent!");
      setBuyModalOpen(false);
    } catch (error) { toast.error("Failed to send request."); }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      await axios.post('https://qcu-marketplace-b08m.onrender.com/api/transactions/messages', {
        receiverId: product.sellerId,
        productId: product._id,
        text: newMessage
      }, { headers: { Authorization: `Bearer ${user.token}` } });
      setNewMessage('');
      fetchMessages();
    } catch (error) { toast.error("Failed to send message."); }
  };

  // BAGONG FUNCTION PARA SA REPORT
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://qcu-marketplace-b08m.onrender.com/api/reports', {
        product: product._id,
        reportedUser: product.sellerId,
        message: reportMessage
      }, { headers: { Authorization: `Bearer ${user.token}` } });
      toast.success("Report submitted. Admins will review it.");
      setReportModalOpen(false);
      setReportMessage('');
    } catch (error) { toast.error("Failed to submit report."); }
  };

  if (loading) return <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center text-gray-600">Loading details...</div>;
  if (!product) return <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center text-gray-500">Product not found.</div>;

  // CHECKER KUNG IKAW ANG SELLER
  const isSeller = user && user._id === product.sellerId;

  return (
    <div className="min-h-screen bg-[#F9F8F6] w-full flex flex-col font-sans pb-20 text-gray-800">
      <Head><title>{product.title} | QCU Marketplace</title></Head>

      <div className="max-w-[1000px] mx-auto px-6 py-10 w-full">
        <button onClick={() => router.back()} className="text-sm text-gray-500 mb-6 flex items-center gap-2 hover:text-[#8A1C30]">
          &larr; Back to Browse
        </button>

        <div className="bg-white rounded-2xl p-8 flex flex-col md:flex-row gap-8 border border-gray-200 shadow-sm">
          
          <div className="w-full md:w-1/2 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center">
            {product.image ? (
              <img src={product.image} className="w-full h-full object-cover" alt="product"/>
            ) : (
              <span className="text-gray-400 text-sm">No Image Available</span>
            )}
          </div>
          
          <div className="w-full md:w-1/2 flex flex-col">
            <div className="flex gap-2 mb-3">
              <span className="text-xs font-medium text-[#8A1C30] bg-red-50 px-3 py-1 rounded-md">{product.category}</span>
              <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-md">{product.condition}</span>
            </div>
            
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">{product.title}</h1>
            <h2 className="text-2xl font-bold text-[#8A1C30] mb-4">₱{product.price}</h2>
            
            <p className="text-sm text-gray-600 leading-relaxed mb-6 font-normal">
              {product.description}
            </p>
            
            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-5 mb-6">
               <div>
                  <p className="text-xs text-gray-500 mb-1">Seller</p>
                  <p className="text-sm font-medium text-gray-800">{product.sellerName}</p>
               </div>
               <div>
                  <p className="text-xs text-gray-500 mb-1">Date Posted</p>
                  <p className="text-sm font-medium text-gray-800">
                    {new Date(product.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
               </div>
            </div>
            
            {/* DYNAMIC POV: SELLER vs BUYER */}
            {isSeller ? (
               <div className="mt-auto bg-yellow-50 border border-yellow-100 rounded-xl p-5 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl mb-2">👋</span>
                  <p className="text-sm font-bold text-yellow-800 mb-1">This is your listing</p>
                  <p className="text-xs text-yellow-600 mb-4">You cannot buy or report your own item.</p>
                  <button 
                    onClick={() => router.push('/my-listings')} 
                    className="bg-white border border-yellow-200 text-yellow-800 px-6 py-2 rounded-lg text-sm font-bold hover:bg-yellow-100 transition-colors shadow-sm"
                  >
                    Manage in My Listings
                  </button>
               </div>
            ) : (
               <div className="mt-auto space-y-3">
                 <div className="flex gap-3">
                   <button 
                     onClick={() => handleActionClick('buy')} 
                     className="flex-1 bg-[#8A1C30] text-white rounded-xl py-3 font-medium text-sm hover:bg-[#6c1525] transition-colors shadow-sm"
                   >
                     I Want to Buy This
                   </button>
                   <button 
                     onClick={() => handleActionClick('chat')} 
                     className="px-5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium border border-gray-200"
                   >
                     Chat
                   </button>
                 </div>
                 <button onClick={() => handleActionClick('report')} className="w-full text-center text-gray-400 text-xs font-medium hover:text-red-500 py-2 transition-colors">
                   Report this Listing
                 </button>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      {buyModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[450px] p-6">
             <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
               <h3 className="font-semibold text-gray-800 text-lg">Arrange Transaction</h3>
               <button onClick={() => setBuyModalOpen(false)} className="text-gray-400 hover:text-gray-800 text-xl">&times;</button>
             </div>
             <form onSubmit={handleBuySubmit} className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                   <p className="text-xs text-gray-500">Purchasing</p>
                   <p className="text-sm font-medium text-gray-800">{product.title}</p>
                   <p className="text-base font-semibold text-[#8A1C30]">₱{product.price}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Meetup Location</label>
                  <input type="text" className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:border-[#8A1C30] outline-none" required onChange={e => setBuyForm({...buyForm, meetupLocation: e.target.value})}/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div>
                      <label className="text-xs text-gray-600 mb-1 block">Date & Time</label>
                      <input type="datetime-local" className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:border-[#8A1C30] outline-none" required onChange={e => setBuyForm({...buyForm, meetupTime: e.target.value})}/>
                   </div>
                   <div>
                      <label className="text-xs text-gray-600 mb-1 block">Payment</label>
                      <select className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm focus:border-[#8A1C30] outline-none" onChange={e => setBuyForm({...buyForm, paymentMethod: e.target.value})}>
                          <option>Cash</option><option>GCash</option><option>Maya</option>
                      </select>
                   </div>
                </div>
                <button type="submit" className="w-full bg-[#8A1C30] text-white py-2.5 rounded-lg font-medium mt-2 text-sm hover:bg-[#6c1525]">Confirm Request</button>
             </form>
          </div>
        </div>
      )}

      {chatModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[400px] h-[500px] flex flex-col">
             <div className="bg-[#8A1C30] p-4 flex justify-between items-center text-white rounded-t-2xl">
                <div className="flex flex-col">
                  <p className="font-medium text-sm">{product.sellerName}</p>
                  <p className="text-xs text-[#E6B93D]">Online</p>
                </div>
                <button onClick={() => setChatModalOpen(false)} className="text-white hover:text-gray-200 text-xl">&times;</button>
             </div>
             <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 flex flex-col">
                <div className="text-center my-2"><span className="text-xs text-gray-500">Start of conversation</span></div>
                {messages.map((msg, i) => {
                  const isMe = msg.senderId === user?._id;
                  return (
                    <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-2.5 rounded-lg max-w-[80%] text-sm ${isMe ? 'bg-[#8A1C30] text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}`}>{msg.text}</div>
                    </div>
                  );
                })}
             </div>
             <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 bg-white flex gap-2 rounded-b-2xl">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#8A1C30]"/>
                <button type="submit" className="bg-[#8A1C30] text-white px-4 rounded-lg hover:bg-[#6c1525] text-sm">Send</button>
             </form>
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[400px] p-6 animate-fadeInUp">
             <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
               <h3 className="font-semibold text-gray-800 text-lg">Report Listing</h3>
               <button onClick={() => setReportModalOpen(false)} className="text-gray-400 hover:text-gray-800 text-xl">&times;</button>
             </div>
             <form onSubmit={handleReportSubmit} className="space-y-4">
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs font-medium border border-red-100">
                   You are reporting <span className="font-bold">"{product.title}"</span>. Admins will investigate this listing and the seller.
                </div>
                <div>
                   <label className="text-xs text-gray-600 mb-1 block font-bold">Reason for reporting <span className="text-red-500">*</span></label>
                   <textarea 
                     value={reportMessage} 
                     onChange={e => setReportMessage(e.target.value)} 
                     placeholder="E.g., Fake item, scam, inappropriate content..." 
                     className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3 text-sm outline-none focus:border-red-500 h-24 resize-none" 
                     required
                   ></textarea>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setReportModalOpen(false)} className="flex-1 bg-white text-gray-600 border border-gray-200 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-red-700 transition-colors">Submit Report</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}