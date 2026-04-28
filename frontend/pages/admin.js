import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import axios from 'axios';
import toast from 'react-hot-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const { user, loading: authLoading, logout } = useAuth(); 
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('Overview');
  const [stats, setStats] = useState({ totalUsers: 0, totalProducts: 0, totalReports: 0 });
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [warningInputs, setWarningInputs] = useState({});

  // Chat & Analytics States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [adminMessages, setAdminMessages] = useState([]);
  const [timeframe, setTimeframe] = useState(7); // Default: Last 7 Days
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) router.push('/login');
      else if (user?.role?.toLowerCase() !== 'admin') router.push('/browse');
      else fetchAdminData();
    }
  }, [user, authLoading, activeTab, searchTerm]);

  useEffect(() => {
    let interval;
    if (isChatOpen && selectedChatUser) {
      fetchChatHistory();
      interval = setInterval(fetchChatHistory, 3000);
    }
    return () => clearInterval(interval);
  }, [isChatOpen, selectedChatUser]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [adminMessages]);

  const fetchAdminData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const prodUrl = searchTerm ? `http://localhost:5000/api/admin/products?search=${searchTerm}` : 'http://localhost:5000/api/admin/products';
      const [statsRes, usersRes, prodsRes, reportsRes, logsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/stats', config),
        axios.get('http://localhost:5000/api/admin/users', config),
        axios.get(prodUrl, config),
        axios.get('http://localhost:5000/api/admin/reports', config),
        axios.get('http://localhost:5000/api/admin/logs', config) 
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setProducts(prodsRes.data);
      setReports(reportsRes.data);
      setLogs(logsRes.data); 
      setLoading(false);
    } catch (error) { console.error("Sync error"); }
  };

  const fetchChatHistory = async () => {
    if (!selectedChatUser) return;
    try {
      const res = await axios.get(`http://localhost:5000/api/transactions/messages/${selectedChatUser._id}/null`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setAdminMessages(res.data);
    } catch (error) { console.error("History sync failed"); }
  };

  const sendAdminMessage = async () => {
    if (!chatMessage.trim()) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post('http://localhost:5000/api/transactions/messages', {
        receiverId: selectedChatUser._id, text: `[OFFICIAL ADMIN]: ${chatMessage}`, productId: null
      }, config);
      setChatMessage('');
      fetchChatHistory();
    } catch (error) { toast.error("Send failed"); }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm("Permanently delete this product?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/admin/products/${id}`, { headers: { Authorization: `Bearer ${user.token}` } });
      toast.success("Product removed");
      fetchAdminData();
    } catch (error) { toast.error("Action failed"); }
  };

  // --- CHART DATA PROCESSOR ---
  const getChartData = () => {
    const data = [];
    const today = new Date();
    for (let i = timeframe - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Bibilangin niya kung ilan ang na-create sa specific na araw na iyon
      const uCount = users.filter(u => new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === dateStr).length;
      const pCount = products.filter(p => new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === dateStr).length;
      
      data.push({ name: dateStr, Users: uCount, Listings: pCount });
    }
    return data;
  };

  const chartData = getChartData();
  const chatUsers = users.filter(u => u.email !== 'chandlerszxc@gmail.com');

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center font-medium text-slate-400 italic text-sm tracking-tight">Syncing Control Panel...</div>;

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans flex text-slate-700">
      <Head><title>Admin Control | QCU</title></Head>

      <div className="w-64 bg-[#0F172A] text-white min-h-screen p-6 flex flex-col shrink-0">
         <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-9 h-9 bg-[#8A1C30] rounded-lg flex items-center justify-center font-bold text-white shadow-lg">Q</div>
            <h2 className="font-semibold text-base">QCU Admin</h2>
         </div>
         <div className="flex flex-col gap-2">
            {['Overview', 'Users', 'Reports', 'Logs'].map(tab => (
               <button key={tab} onClick={() => setActiveTab(tab)} className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab ? 'bg-[#8A1C30] text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>{tab}</button>
            ))}
         </div>
         <button onClick={() => setIsChatOpen(true)} className="mt-6 bg-slate-800 border border-slate-700 py-3 rounded-xl text-[11px] font-semibold hover:bg-[#8A1C30] transition-all">💬 Chat Support Hub</button>
         <button onClick={() => router.push('/browse')} className="mt-auto text-[11px] text-slate-500 p-4">← Marketplace</button>
      </div>

      <div className="flex-1 flex flex-col max-h-screen overflow-hidden">
        <div className="bg-white h-[72px] border-b flex items-center justify-between px-8 shrink-0 shadow-sm">
           <h2 className="text-xl font-semibold text-slate-800">{activeTab}</h2>
           <button onClick={logout} className="text-xs font-semibold text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg">Logout</button>
        </div>

        <div className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'Overview' && (
            <div className="space-y-8">
              
              {/* TOP STATS */}
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border shadow-sm"><p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Users</p><p className="text-3xl font-semibold">{stats.totalUsers}</p></div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm border-red-50"><p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Items</p><p className="text-3xl font-semibold text-[#8A1C30]">{stats.totalProducts}</p></div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm border-orange-50"><p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Reports</p><p className="text-3xl font-semibold text-orange-500">{stats.totalReports}</p></div>
              </div>

              {/* ANALYTICS CHART SECTION */}
              <div className="bg-white p-6 rounded-2xl border shadow-sm border-slate-100">
                 <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="font-semibold text-sm text-slate-800">System Activity Analytics</h3>
                      <p className="text-[10px] text-slate-400 mt-1">Monitor new users and listings over time</p>
                    </div>
                    <select 
                      className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-4 py-2 outline-none font-medium cursor-pointer"
                      value={timeframe} 
                      onChange={(e) => setTimeframe(Number(e.target.value))}
                    >
                       <option value={7}>Last 7 Days</option>
                       <option value={14}>Last 14 Days</option>
                       <option value={30}>Last 30 Days</option>
                    </select>
                 </div>
                 <div className="h-[280px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <defs>
                         <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                         </linearGradient>
                         <linearGradient id="colorListings" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#8A1C30" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#8A1C30" stopOpacity={0}/>
                         </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} dy={10} />
                       <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} allowDecimals={false} />
                       <Tooltip 
                         contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                         labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }} 
                         itemStyle={{ fontSize: '12px', fontWeight: '500' }}
                       />
                       <Area type="monotone" name="New Users" dataKey="Users" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                       <Area type="monotone" name="New Listings" dataKey="Listings" stroke="#8A1C30" strokeWidth={2} fillOpacity={1} fill="url(#colorListings)" />
                     </AreaChart>
                   </ResponsiveContainer>
                 </div>
              </div>

              {/* INVENTORY TABLE */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center bg-white"><h3 className="font-semibold text-sm">Inventory Management</h3><input type="text" placeholder="Search..." className="w-64 px-4 py-2 bg-slate-50 border rounded-xl text-sm outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase">
                    <tr><th className="p-5">Image</th><th className="p-5">Title</th><th className="p-5">Seller</th><th className="p-5 text-right">Action</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.map(p => (
                      <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-5"><div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden border">{p.image && <img src={p.image} className="w-full h-full object-cover"/>}</div></td>
                        <td className="p-5 font-medium">{p.title}</td>
                        <td className="p-5 text-slate-500 text-xs">{p.sellerName}</td>
                        <td className="p-5 text-right space-x-3">
                           {p.status === 'Pending' && <button onClick={() => axios.put(`http://localhost:5000/api/admin/products/${p._id}/approve`, {}, { headers: { Authorization: `Bearer ${user.token}` }}).then(() => fetchAdminData())} className="text-green-600 font-semibold text-xs hover:underline">Approve</button>}
                           <button onClick={() => {setSelectedChatUser({_id: p.sellerId, name: p.sellerName}); setIsChatOpen(true);}} className="text-blue-500 font-semibold text-xs hover:underline">Chat</button>
                           <button onClick={() => handleDeleteProduct(p._id)} className="text-red-500 font-semibold text-xs hover:underline">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Users' && (
             <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase"><tr><th className="p-5">Name</th><th className="p-5">Email</th><th className="p-5 text-right">Action</th></tr></thead>
                 <tbody className="divide-y divide-slate-50">
                    {users.map(u => (
                      <tr key={u._id} className="hover:bg-slate-50">
                        <td className="p-5 font-medium">{u.name}</td><td className="p-5 text-slate-500 text-xs">{u.email}</td>
                        <td className="p-5 text-right space-x-4">
                          <button onClick={() => {setSelectedChatUser(u); setIsChatOpen(true);}} className="text-blue-500 font-semibold text-xs hover:underline">Chat</button>
                          {u.email !== 'chandlerszxc@gmail.com' && <button onClick={() => axios.delete(`http://localhost:5000/api/admin/users/${u._id}`, { headers: { Authorization: `Bearer ${user.token}` }}).then(() => fetchAdminData())} className="text-red-500 font-semibold text-xs hover:underline">Remove</button>}
                        </td>
                      </tr>
                    ))}
                 </tbody>
               </table>
             </div>
          )}

          {activeTab === 'Reports' && (
             <div className="space-y-4">
                {reports.map(r => (
                  <div key={r._id} className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row gap-6">
                     <div className="flex-1"><span className="text-[10px] font-bold uppercase bg-orange-100 text-orange-700 px-2 py-1 rounded">Report {r.status}</span><p className="font-semibold text-slate-800 mt-3">Target: <span className="text-red-600">{r.reportedUser?.name}</span></p><p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl mt-2 italic border-l-4 border-orange-400">"{r.message}"</p></div>
                     {r.status === 'pending' && (
                       <div className="w-full md:w-72 space-y-2">
                          <input type="text" placeholder="Warning message..." className="w-full border rounded-xl p-3 text-xs outline-none focus:border-[#8A1C30]" onChange={(e) => setWarningInputs({...warningInputs, [r._id]: e.target.value})} />
                          <button onClick={() => axios.put(`http://localhost:5000/api/admin/reports/${r._id}/resolve`, { warningMessage: warningInputs[r._id] || "" }, { headers: { Authorization: `Bearer ${user.token}` } }).then(() => fetchAdminData())} className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl text-xs">Resolve & Send Warning</button>
                       </div>
                     )}
                  </div>
                ))}
             </div>
          )}

          {activeTab === 'Logs' && (
             <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase"><tr><th className="p-5">Time</th><th className="p-5">Admin</th><th className="p-5">Action</th><th className="p-5">Details</th></tr></thead>
                 <tbody className="divide-y divide-slate-50">
                    {logs.map(log => (
                      <tr key={log._id}>
                        <td className="p-5 text-slate-400 text-[11px]">{new Date(log.timestamp).toLocaleString()}</td><td className="p-5 font-semibold text-slate-700 text-xs">{log.adminId?.name}</td>
                        <td className="p-5"><span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[9px] font-bold uppercase">{log.action}</span></td><td className="p-5 text-slate-500 text-[11px]">{log.details}</td>
                      </tr>
                    ))}
                 </tbody>
               </table>
             </div>
          )}
        </div>
      </div>

      {isChatOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[900px] h-[650px] flex overflow-hidden">
             <div className="w-1/3 border-r flex flex-col bg-slate-50">
                <div className="p-5 border-b bg-white flex justify-between items-center"><h3 className="font-bold text-slate-800 text-sm">Studyante List</h3></div>
                <div className="flex-1 overflow-y-auto">
                   {chatUsers.map(u => (
                     <div key={u._id} onClick={() => {setSelectedChatUser(u); setAdminMessages([]);}} className={`p-4 cursor-pointer hover:bg-white border-b transition-all ${selectedChatUser?._id === u._id ? 'bg-white border-l-4 border-[#8A1C30]' : ''}`}>
                        <p className="font-semibold text-sm text-slate-800">{u.name}</p><p className="text-[10px] text-slate-400">{u.email}</p>
                     </div>
                   ))}
                </div>
             </div>
             <div className="flex-1 flex flex-col bg-white">
                {selectedChatUser ? (
                  <>
                    <div className="p-5 border-b flex justify-between items-center shadow-sm">
                       <div><p className="text-[10px] text-gray-400 font-bold uppercase">Chat History</p><p className="font-bold text-slate-800">{selectedChatUser.name}</p></div>
                       <button onClick={() => {setIsChatOpen(false); setSelectedChatUser(null);}} className="text-gray-400 hover:text-gray-800 text-2xl">&times;</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#F8FAFC]">
                       {adminMessages.map((msg, i) => {
                         const isMe = msg.senderId === user?._id;
                         return (
                           <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className={`p-3 rounded-2xl max-w-[75%] text-sm ${isMe ? 'bg-[#8A1C30] text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                                {msg.text}<p className={`text-[8px] mt-1 ${isMe ? 'text-red-100' : 'text-gray-400'}`}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                           </div>
                         );
                       })}
                       <div ref={chatEndRef} />
                    </div>
                    <div className="p-5 border-t bg-white">
                       <div className="flex gap-2">
                          <input type="text" value={chatMessage} onChange={e => setChatMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendAdminMessage(); } }} placeholder="Type your message..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#8A1C30]" />
                          <button onClick={sendAdminMessage} className="bg-[#8A1C30] text-white px-6 py-3 rounded-xl font-bold text-sm">Send</button>
                       </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10 text-center"><p className="text-sm font-semibold">Select a student to start chatting.</p></div>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}