import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Transactions() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Chats');
  const [transactions, setTransactions] = useState({ purchases: [], sales: [] });
  const [adminThread, setAdminThread] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Ginamit natin itong chatContainerRef para sa safe na pag-scroll
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (user) {
      fetchData();
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [user, authLoading]);

  useEffect(() => {
    let interval;
    if (selectedTx) {
      fetchMessages();
      interval = setInterval(fetchMessages, 3000);
    }
    return () => clearInterval(interval);
  }, [selectedTx]);

  // SAFE AUTO-SCROLL: Hindi na nito tutulakin ang footer pababa!
  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.get('https://qcu-marketplace-b08m.onrender.com/api/transactions/my-transactions', config);
      setTransactions(res.data);
      setAdminThread(res.data.adminThread);
    } catch (error) { console.error(error); }
  };

  const fetchMessages = async () => {
    if (!selectedTx) return;
    try {
      const pId = selectedTx.isAdminThread ? 'null' : selectedTx.productId;
      // Gamitin lang natin ang 'admin' string, bahala na backend doon
      const otherId = selectedTx.isAdminThread ? 'admin' : (selectedTx.buyerId === user._id ? selectedTx.sellerId : selectedTx.buyerId);
      
      const res = await axios.get(`https://qcu-marketplace-b08m.onrender.com/api/transactions/messages/${otherId}/${pId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setMessages(res.data);
    } catch (error) { console.error(error); }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      // Gamitin lang natin ang 'admin' string
      const receiverId = selectedTx.isAdminThread ? 'admin' : (selectedTx.buyerId === user._id ? selectedTx.sellerId : selectedTx.buyerId);
      const productId = selectedTx.isAdminThread ? null : selectedTx.productId;
      
      await axios.post('https://qcu-marketplace-b08m.onrender.com/api/transactions/messages', {
        receiverId, productId, text: newMessage
      }, { headers: { Authorization: `Bearer ${user.token}` } });
      
      setNewMessage('');
      fetchMessages();
    } catch (error) { toast.error("Failed to send message"); }
  };

  const combinedChats = [];
  if (adminThread) combinedChats.push(adminThread);
  if (transactions.purchases) combinedChats.push(...transactions.purchases);
  if (transactions.sales) combinedChats.push(...transactions.sales);

  if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center font-medium text-slate-400 italic text-sm tracking-tight">Syncing data...</div>;

  return (
    <div className="min-h-screen bg-[#F9F8F6] font-sans flex flex-col">
      <Head><title>Inbox | QCU Marketplace</title></Head>
      
      {/* FIXED HEIGHT LAYOUT: Para hindi mapush pababa ang buong website */}
      <div className="max-w-[1200px] mx-auto w-full px-6 py-8 h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 overflow-hidden">
        
        {/* SIDEBAR */}
        <div className="w-full md:w-[350px] flex flex-col h-full shrink-0">
          <h1 className="text-2xl font-semibold mb-6 text-slate-800 tracking-tight">Inbox</h1>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-2">
             {combinedChats.map((tx, idx) => (
               <div key={idx} onClick={() => setSelectedTx(tx)} className={`p-4 rounded-2xl cursor-pointer border transition-all ${selectedTx?._id === tx._id ? 'border-[#8A1C30] bg-white shadow-md' : 'border-slate-100 bg-white hover:bg-slate-50'}`}>
                  <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase ${tx.isAdminThread ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{tx.isAdminThread ? 'Official' : tx.status}</span>
                  <p className="font-semibold text-sm text-slate-800 truncate mt-1">{tx.productTitle}</p>
                  <p className="text-[10px] text-slate-500 truncate">{tx.isAdminThread ? 'Direct Admin Support' : (tx.buyerId === user._id ? `Seller: ${tx.sellerName}` : `Buyer: ${tx.buyerName}`)}</p>
               </div>
             ))}
          </div>
        </div>

        {/* CHAT AREA */}
        <div className="flex-1 bg-white border border-slate-200 rounded-[32px] flex flex-col shadow-sm h-full overflow-hidden">
           {selectedTx ? (
             <>
               <div className="p-5 border-b border-slate-50 flex items-center gap-3 shrink-0 bg-white">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${selectedTx.isAdminThread ? 'bg-red-700' : 'bg-slate-800'}`}>{selectedTx.isAdminThread ? 'A' : selectedTx.sellerName?.charAt(0)}</div>
                  <p className="font-semibold text-slate-800 text-sm">{selectedTx.isAdminThread ? 'SYSTEM ADMIN' : selectedTx.productTitle}</p>
               </div>
               
               {/* SCROLLABLE CHAT CONTAINER (Safe Scroll) */}
               <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FBFBFA]">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.senderId === user._id ? 'justify-end' : 'justify-start'}`}>
                       <div className={`p-3.5 rounded-2xl max-w-[80%] text-sm shadow-sm ${m.senderId === user._id ? 'bg-[#8A1C30] text-white rounded-br-none' : 'bg-white border text-slate-800 rounded-bl-none'}`}>
                          {m.text}
                          <p className={`text-[8px] mt-1 font-semibold opacity-50 ${m.senderId === user._id ? 'text-white' : 'text-slate-400'}`}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                       </div>
                    </div>
                  ))}
               </div>

               <form onSubmit={handleSendMessage} className="p-5 border-t flex gap-2 shrink-0 bg-white">
                  <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={(e) => {if(e.key === 'Enter' && !e.shiftKey){e.preventDefault(); handleSendMessage(e);}}} placeholder="Type a message..." className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#8A1C30]" />
                  <button type="submit" className="bg-[#8A1C30] text-white px-6 py-3 rounded-xl font-bold text-sm">Send</button>
               </form>
             </>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-300 font-medium">Select a thread to start chatting.</div>
           )}
        </div>
      </div>
    </div>
  );
}