import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
import Brand from '../components/Brand';
import AdminOperations from '../components/AdminOperations';
import Modal from '../components/Modal';
import { demoProducts, formatPrice } from '../lib/demo';

const navigation = [['Overview', 'grid'], ['Listings', 'store'], ['Users', 'user'], ['Reports', 'shield'], ['Activity', 'clock'], ['Privacy & insights', 'shield']];
const sampleUsers = [
  { _id: 'sample-user-1', name: 'Mika Santos', email: 'mika.santos@example.invalid', role: 'student', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { _id: 'sample-user-2', name: 'Gabriel Cruz', email: 'gabriel.cruz@example.invalid', role: 'student', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { _id: 'sample-user-3', name: 'Alex Reyes', email: 'alex.reyes@example.invalid', role: 'student', createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { _id: 'sample-admin', name: 'Campus Admin', email: 'admin@example.invalid', role: 'admin', createdAt: new Date(Date.now() - 6 * 86400000).toISOString() },
];
const sampleReports = [
  { _id: 'sample-report-1', status: 'pending', reportedUser: sampleUsers[1], product: { title: 'Scientific calculator' }, message: 'The item description and uploaded photo show different models. Please review the listing.', createdAt: new Date().toISOString() },
  { _id: 'sample-report-2', status: 'resolved', reportedUser: sampleUsers[0], product: { title: 'Engineering reference book' }, message: 'This appears to be a duplicate listing.', createdAt: new Date(Date.now() - 86400000).toISOString() },
];
const initials = (name = 'User') => name.split(' ').filter(Boolean).map(word => word[0]).slice(0, 2).join('').toUpperCase();
const date = value => value ? new Date(value).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
const badge = value => ['approved', 'active', 'resolved'].includes(value?.toLowerCase()) ? 'badge-success' : ['rejected', 'removed'].includes(value?.toLowerCase()) ? 'admin-badge-danger' : 'badge-warning';

export default function AdminDashboard() {
  const { user, loading: authLoading, logout, isPreview } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Overview');
  const [stats, setStats] = useState({ totalUsers: 0, totalProducts: 0, totalReports: 0 });
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [timeframe, setTimeframe] = useState(7);
  const [busy, setBusy] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [rejectTarget,setRejectTarget]=useState(null),[rejectionReason,setRejectionReason]=useState(''),[rejectionError,setRejectionError]=useState('');
  const [warnings, setWarnings] = useState({});
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [messageFeedback, setMessageFeedback] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatError, setChatError] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const chatContainer = useRef(null);
  const chatRequest=useRef(0);
  const chatSelection=useRef(0);
  const invalidateChatRequests=useCallback(()=>{chatRequest.current++;},[]);
  const preview = Boolean(isPreview || user?.isPreview);

  const fetchData = useCallback(async () => {
    if (!user || preview) return;
    setLoading(true); setError('');
    const config = { timeout: 8000 };
    try {
      const responses = await Promise.all(['stats', 'users', 'products', 'reports', 'logs'].map(path => api.get(`/admin/${path}`, config)));
      setStats(responses[0].data);
      [setUsers, setProducts, setReports, setLogs].forEach((setter, index) => setter(Array.isArray(responses[index + 1].data) ? responses[index + 1].data : []));
    } catch { setError('The admin service is unavailable. Check that the backend is running, then try again.'); }
    finally { setLoading(false); }
  }, [user, preview]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role?.toLowerCase() !== 'admin') { router.replace('/browse'); return; }
    if (preview) {
      Promise.resolve().then(() => {
        const samples = demoProducts.map((product, index) => ({ ...product, status: index < 3 ? 'Pending' : 'Approved', createdAt: new Date(Date.now() - index * 86400000).toISOString() }));
        setProducts(samples); setUsers(sampleUsers); setReports(sampleReports);
        setStats({ totalUsers: sampleUsers.length, totalProducts: samples.length, totalReports: sampleReports.length });
        setLogs([
          { _id: 'sample-log-1', timestamp: new Date().toISOString(), adminId: { name: 'Campus Admin' }, action: 'Approved listing', details: 'Engineering reference book was approved for the marketplace.' },
          { _id: 'sample-log-2', timestamp: new Date(Date.now() - 3600000).toISOString(), adminId: { name: 'Campus Admin' }, action: 'Resolved report', details: 'Duplicate listing report reviewed and resolved.' },
        ]);
        setLoading(false);
      });
    } else { Promise.resolve().then(fetchData); }
  }, [authLoading, user, preview, router, fetchData]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update(); preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!selectedChatUser || !user || preview) return;
    const request=++chatRequest.current;
    try {
      const response = await api.get(`/transactions/messages/${selectedChatUser._id}/null`, { timeout: 8000 });
      if(request!==chatRequest.current)return;
      setMessages(Array.isArray(response.data) ? response.data : []); setChatError('');
    } catch { if(request===chatRequest.current)setChatError('Messages could not be loaded. Close and reopen this conversation to retry.'); }
    finally { if(request===chatRequest.current)setChatLoading(false); }
  }, [selectedChatUser, user, preview]);

  useEffect(() => {
    if (!isChatOpen || !selectedChatUser) return;
    if (preview) {
      Promise.resolve().then(() => setMessages([{ _id: 'sample-message', senderId: selectedChatUser._id, text: 'Hi! Where can I find the guidelines for posting an item?', createdAt: new Date().toISOString() }]));
      return;
    }
    Promise.resolve().then(fetchMessages);
    const interval = setInterval(fetchMessages, 5000);
    return () => {clearInterval(interval);invalidateChatRequests();};
  }, [isChatOpen, selectedChatUser, preview, fetchMessages, invalidateChatRequests]);
  useEffect(() => { if (chatContainer.current) chatContainer.current.scrollTop = chatContainer.current.scrollHeight; }, [messages]);

  const localFeedback = () => toast.success('Updated in this preview only. No live data was changed.', { id: 'admin-preview-feedback' });
  const addLog = (action, details) => setLogs(current => [{ _id: `preview-${Date.now()}`, timestamp: new Date().toISOString(), adminId: { name: user?.name || 'Campus Admin' }, action, details }, ...current]);
  const config = { timeout: 8000 };
  const approve = async product => {
    setBusy(product._id);
    try {
      if (preview) { setProducts(current => current.map(item => item._id === product._id ? { ...item, status: 'Approved' } : item)); addLog('Approved listing', product.title); localFeedback(); }
      else { await api.put(`/admin/products/${product._id}/approve`, {}, config); toast.success('Listing approved.'); await fetchData(); }
    } catch { toast.error('Approval failed. Please try again.'); } finally { setBusy(''); }
  };
  const reject = async event => {
    event.preventDefault();setBusy(rejectTarget._id);setRejectionError('');
    try{if(preview){setProducts(current=>current.map(item=>item._id===rejectTarget._id?{...item,status:'Rejected',rejectionReason}:item));addLog('Rejected listing',rejectTarget.title);localFeedback();}else{await api.put(`/admin/products/${rejectTarget._id}/reject`,{reason:rejectionReason});await fetchData();}setRejectTarget(null);setRejectionReason('');}
    catch(error){setRejectionError(error.response?.data?.message||'The review could not be saved.');}finally{setBusy('');}
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(deleteTarget.id);
    try {
      if (preview) {
        if (deleteTarget.kind === 'products') { setProducts(current => current.filter(item => item._id !== deleteTarget.id)); setStats(current => ({ ...current, totalProducts: Math.max(0, current.totalProducts - 1) })); }
        else { setUsers(current => current.filter(item => item._id !== deleteTarget.id)); setStats(current => ({ ...current, totalUsers: Math.max(0, current.totalUsers - 1) })); }
        addLog('Removed item', deleteTarget.name); localFeedback();
      } else { await api.delete(`/admin/${deleteTarget.kind}/${deleteTarget.id}`, config); toast.success('Removed from marketplace.'); await fetchData(); }
      setDeleteTarget(null);
    } catch { toast.error('Could not remove this item. Please try again.'); } finally { setBusy(''); }
  };
  const resolve = async report => {
    setBusy(report._id);
    try {
      if (preview) { setReports(current => current.map(item => item._id === report._id ? { ...item, status: 'resolved' } : item)); addLog('Resolved report', report.message); localFeedback(); }
      else { await api.put(`/admin/reports/${report._id}/resolve`, { warningMessage: warnings[report._id] || '' }, config); toast.success('Report resolved.'); await fetchData(); }
    } catch { toast.error('The report could not be resolved. Please try again.'); } finally { setBusy(''); }
  };
  const openChat = person => { chatSelection.current++;chatRequest.current++;toast.dismiss('admin-preview-feedback'); setMessageFeedback(''); setSelectedChatUser(person || null); setMessages([]); setChatError(''); setChatMessage(''); setChatLoading(Boolean(person && !preview)); setIsChatOpen(true); };
  const sendMessage = async event => {
    event.preventDefault();
    if (!chatMessage.trim() || !selectedChatUser) return;
    const selection=chatSelection.current, sentText=chatMessage.trim();
    setBusy('message'); setMessageFeedback('');
    try {
      if (preview) { setMessages(current => [...current, { _id: `preview-message-${Date.now()}`, senderId: user._id, text: chatMessage.trim(), createdAt: new Date().toISOString() }]); setMessageFeedback('Preview message added locally. It was not sent.'); }
      else { await api.post('/transactions/messages', { receiverId: selectedChatUser._id, text: sentText, productId: null }, config); if(selection!==chatSelection.current)return;await fetchMessages(); }
      if(selection!==chatSelection.current)return;
      setChatMessage(current=>current.trim()===sentText?'':current);
    } catch { if(selection===chatSelection.current)setMessageFeedback('Message was not sent. Please try again.');else toast.error('The message to the previous member was not sent. Open that conversation to try again.'); } finally { setBusy(''); }
  };

  const pending = products.filter(product => product.status?.toLowerCase() === 'pending').length;
  const pendingReports = reports.filter(report => report.status?.toLowerCase() === 'pending').length;
  const filteredProducts = products.filter(product => `${product.title} ${product.sellerName} ${product.category}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'All' || product.status?.toLowerCase() === statusFilter.toLowerCase()));
  const filteredUsers = users.filter(person => `${person.name} ${person.email}`.toLowerCase().includes(search.toLowerCase()));
  const chartData = Array.from({ length: timeframe }, (_, index) => {
    const day = new Date(); day.setDate(day.getDate() - timeframe + index + 1);
    const match = value => value && new Date(value).toLocaleDateString('en-PH') === day.toLocaleDateString('en-PH');
    return { name: day.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }), Users: users.filter(person => match(person.createdAt)).length, Listings: products.filter(product => match(product.createdAt)).length };
  });
  const title = { Overview: 'Marketplace overview.', Listings: 'Manage campus listings.', Users: 'The QCU community.', Reports: 'Review community reports.', Activity: 'A clear paper trail.', 'Privacy & insights':'Privacy & resolution.' }[activeTab];
  const subtitle = { Overview: 'Review the queue, help a student, keep good finds moving.', Listings: 'Review new items and manage what appears in the marketplace.', Users: 'Find members, offer support, and manage marketplace access.', Reports: 'Review concerns from the community and follow up thoughtfully.', Activity: 'A clear record of moderation and administrative activity.', 'Privacy & insights':'Handle data requests and disputes, and review consented aggregate page views.' }[activeTab];

  const listingTable = limit => <section className="panel admin-table-panel">
    <div className="admin-section-top"><div><h2>{limit ? 'Listings to review' : 'All listings'}</h2><p className="muted">{limit ? 'New items waiting for your approval.' : `${filteredProducts.length} listings in view`}</p></div>{limit ? <button className="btn btn-ghost" onClick={() => { setActiveTab('Listings'); setStatusFilter('Pending'); setSearch(''); }}>View all <Icon name="arrow-right" size={16} /></button> : <label className="admin-filter"><span className="sr-only">Filter listing status</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option>All</option><option>Pending</option><option>Approved</option><option>Rejected</option></select></label>}</div>
    {(limit ? pending > 0 : filteredProducts.length > 0) && <><p className="admin-table-hint"><Icon name="arrow-right" size={13} />Scroll the table to see status and actions.</p><div className="admin-table-scroll" role="region" aria-label="Listings table, scroll horizontally for more columns" tabIndex={0}><table className="admin-table"><thead><tr><th>Item</th><th>Seller</th><th>Price</th><th>Status</th><th className="admin-action-heading">Actions</th></tr></thead><tbody>
      {(limit ? products.filter(product => product.status?.toLowerCase() === 'pending').slice(0, limit) : filteredProducts).map(product => <tr key={product._id}>
        <td><div className="admin-item"><div className="admin-item-image">{product.image ? <Image src={product.image} alt="" width={64} height={64} unoptimized /> : <Icon name="box" />}</div><div><strong>{product.title}</strong><span>{product.category}</span></div></div></td>
        <td>{product.sellerName || 'Campus member'}</td><td className="admin-price">{formatPrice(product.price)}</td><td><span className={`badge ${badge(product.status)}`}>{product.status || 'Pending'}</span></td>
        <td><div className="admin-actions">{product.status?.toLowerCase() === 'pending' && <button className="admin-approve" disabled={busy === product._id} onClick={() => approve(product)}><Icon name="check" size={15} />{busy === product._id ? 'Working…' : 'Approve'}</button>}<button className="admin-icon-button admin-danger" disabled={busy===product._id} aria-label={`Reject ${product.title}`} onClick={()=>{setRejectTarget(product);setRejectionReason('');setRejectionError('');}}><Icon name="x" size={17}/></button><button className="admin-icon-button" aria-label={`Message ${product.sellerName || 'seller'}`} onClick={() => openChat({ _id: typeof product.sellerId === 'object' ? product.sellerId._id : product.sellerId, name: product.sellerName || 'Seller' })}><Icon name="message" size={17} /></button><button className="admin-icon-button admin-danger" aria-label={`Remove ${product.title}`} onClick={() => setDeleteTarget({ kind: 'products', id: product._id, name: product.title })}><Icon name="trash" size={17} /></button></div></td>
      </tr>)}
    </tbody></table></div></>}
    {(limit ? !pending : !filteredProducts.length) && <div className="admin-table-empty"><Icon name="check-circle" size={28} /><h3>{limit ? 'You’re all caught up.' : 'No listings match this view.'}</h3><p>{limit ? 'New listings will appear here when they need a review.' : 'Try another search or change the status filter.'}</p>{!limit && <button className="btn btn-secondary" onClick={() => { setSearch(''); setStatusFilter('All'); }}>Clear filters</button>}</div>}
  </section>;

  if (authLoading || !user || user.role?.toLowerCase() !== 'admin') return <div className="admin-loading" role="status">Opening your admin workspace…</div>;

  return <div className="admin-workspace">
    <Head><title>{activeTab} · QCU Admin</title></Head>
    <aside className="admin-sidebar"><div className="admin-brand"><Brand /></div><div className="admin-workspace-label"><Icon name="shield" size={14} /> ADMIN WORKSPACE</div>
      <nav aria-label="Admin navigation" className="admin-navigation">{navigation.map(([tab, icon]) => <button key={tab} className={activeTab === tab ? 'is-active' : ''} onClick={() => { setActiveTab(tab); setSearch(''); setStatusFilter('All'); }} aria-current={activeTab === tab ? 'page' : undefined}><Icon name={icon} size={19} /><span>{tab}</span>{tab === 'Listings' && pending > 0 && <small>{pending}</small>}{tab === 'Reports' && pendingReports > 0 && <small>{pendingReports}</small>}</button>)}</nav>
      <label className="admin-mobile-section"><span>Workspace section</span><select aria-label="Admin section" value={activeTab} onChange={event=>{setActiveTab(event.target.value);setSearch('');setStatusFilter('All');}}>{navigation.map(([tab])=><option key={tab} value={tab}>{tab}</option>)}</select></label>
      <div className="admin-sidebar-bottom"><div className="admin-community-note"><Icon name="shield" size={22} /><h3>A thoughtful marketplace.</h3><p>Review with care. Keep every exchange clear, fair, and human.</p></div><button onClick={() => openChat(null)} className="admin-support-link"><Icon name="message" size={18} /> Support inbox <Icon name="arrow-up-right" size={15} /></button><Link href="/browse" className="admin-marketplace-link"><Icon name="arrow-left" size={17} /> Back to marketplace</Link></div>
    </aside>
    <div className="admin-main"><header className="admin-topbar"><div className="admin-breadcrumb"><Link href="/browse" className="admin-home-link" aria-label="Back to marketplace"><Icon name="store" size={18}/><span>Marketplace</span></Link><span>/</span> <strong>{activeTab}</strong></div><div className="admin-topbar-account"><span className="admin-live-label"><span />{preview ? 'Design preview' : 'Admin access'}</span><span className="admin-avatar">{initials(user.name)}</span><div className="admin-account-name"><strong>{user.name || 'Campus Admin'}</strong><span>Administrator</span></div><button onClick={() => openChat(null)} className="admin-icon-button" aria-label="Open support inbox"><Icon name="message" size={20} /></button><button onClick={logout} className="admin-icon-button" aria-label="Log out"><Icon name="log-out" size={18} /></button></div></header>
      <div className="admin-content">
        {preview && <div className="admin-preview-note"><Icon name="eye" size={16} /><span><strong>Sample admin workspace.</strong> All preview actions stay in this session.</span></div>}
        <div className="admin-page-intro"><div><p className="eyebrow">CAMPUS OPERATIONS / {activeTab.toUpperCase()}</p><h1>{title}</h1><p className="muted">{subtitle}</p></div><div className="admin-intro-actions"><button className="admin-icon-button admin-refresh" aria-label="Refresh marketplace data" onClick={fetchData} disabled={loading}><Icon name="refresh" size={18}/></button>{activeTab === 'Overview' ? <button className="btn btn-primary" onClick={() => { setActiveTab('Listings'); setStatusFilter('Pending'); }}><Icon name="check-circle" size={17} />Review listings {pending > 0 && <span className="admin-button-count">{pending}</span>}</button> : <button className="btn btn-secondary" onClick={() => openChat(null)}><Icon name="message" size={17} />Support inbox</button>}</div></div>
        {error && <div className="admin-error" role="alert"><div><Icon name="alert" size={20} /><span>{error}</span></div><button className="btn btn-secondary" onClick={fetchData} disabled={loading}>{loading ? 'Retrying…' : 'Try again'}</button></div>}
        {loading ? <div className="admin-loading-panel" role="status"><div className="admin-loading-dot" /><h2>Gathering your marketplace activity…</h2><p className="muted">This will only take a moment.</p></div> : <>
          {activeTab === 'Overview' && <>
            <div className="admin-stats-grid">{[['Community members', stats.totalUsers ?? users.length, 'user', 'Registered marketplace accounts'], ['Marketplace listings', stats.totalProducts ?? products.length, 'store', 'Items across every category'], ['Awaiting review', pending, 'clock', 'New listings that need a look'], ['Open reports', pendingReports, 'shield', 'Community concerns to follow up']].map(([label, value, icon, caption], index) => <div className={`panel admin-stat ${index === 2 ? 'admin-stat-highlight' : ''}`} key={label}><div className="admin-stat-label"><span>{label}</span><Icon name={icon} size={19} /></div><strong>{value}</strong><p>{caption}</p></div>)}</div>
            <div className="admin-overview-middle"><section className="panel admin-chart-panel"><div className="admin-section-top"><div><h2>Campus activity</h2><p className="muted">New members and listings, day by day</p></div><label className="admin-filter"><span className="sr-only">Activity date range</span><select value={timeframe} onChange={event => setTimeframe(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={14}>Last 14 days</option><option value={30}>Last 30 days</option></select></label></div><div className="admin-chart-legend"><span><i />Listings</span><span><i />Members</span>{preview && <small>Sample activity</small>}</div><div className="admin-chart" role="img" aria-label={`New members and listings over the last ${timeframe} days`}><ResponsiveContainer width="100%" height="100%" initialDimension={{width:600,height:260}} minWidth={0}><AreaChart data={chartData} margin={{ top: 12, right: 10, left: -24, bottom: 0 }}><defs><linearGradient id="adminListingFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.16} /><stop offset="100%" stopColor="var(--accent)" stopOpacity={0} /></linearGradient><linearGradient id="adminMemberFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--ink)" stopOpacity={0.15} /><stop offset="100%" stopColor="var(--ink)" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--border)" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted)' }} minTickGap={25} dy={10} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted)' }} /><Tooltip contentStyle={{ border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14 }} /><Area type="monotone" dataKey="Users" name="Members" stroke="var(--ink)" strokeDasharray="5 4" fill="url(#adminMemberFill)" strokeWidth={2} isAnimationActive={!reducedMotion} animationDuration={420} /><Area type="monotone" dataKey="Listings" stroke="var(--accent)" fill="url(#adminListingFill)" strokeWidth={2.5} isAnimationActive={!reducedMotion} animationDuration={420} /></AreaChart></ResponsiveContainer></div><details className="admin-chart-data"><summary>View activity as a table</summary><table><thead><tr><th>Date</th><th>Members</th><th>Listings</th></tr></thead><tbody>{chartData.map(day => <tr key={day.name}><td>{day.name}</td><td>{day.Users}</td><td>{day.Listings}</td></tr>)}</tbody></table></details></section><section className="admin-attention-panel"><div className="admin-attention-icon"><Icon name="shield" size={24} /></div><p className="eyebrow">COMMUNITY CARE</p><h2>{pendingReports ? "A concern needs a closer look." : "A clear report queue."}</h2><p>{pendingReports ? "Review the details and help the community move forward." : "No open reports right now. New concerns will appear here for review."}</p><button onClick={() => setActiveTab('Reports')} className="admin-attention-action"><span>Review community reports</span><Icon name="arrow-right" size={18} /></button><div className="admin-attention-count"><strong>{pendingReports}</strong><span>{pendingReports === 1 ? 'report needs' : 'reports need'} your attention</span></div></section></div>
            {listingTable(4)}
          </>}
          {['Listings', 'Users'].includes(activeTab) && <div className="admin-search-toolbar"><label className="admin-search"><Icon name="search" size={18} /><span className="sr-only">Search {activeTab.toLowerCase()}</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder={activeTab === 'Listings' ? 'Search by item, category, or seller…' : 'Search by name or email…'} />{search && <button onClick={() => setSearch('')} aria-label="Clear search"><Icon name="x" size={15} /></button>}</label><span>{activeTab === 'Users' ? `${filteredUsers.length} members` : `${filteredProducts.length} listings`}</span></div>}
          {activeTab === 'Listings' && listingTable()}
          {activeTab === 'Users' && <section className="panel admin-table-panel"><div className="admin-table-scroll" role="region" aria-label="Scrollable data table" tabIndex={0}><table className="admin-table"><thead><tr><th>Member</th><th>Email address</th><th>Role</th><th>Joined</th><th className="admin-action-heading">Actions</th></tr></thead><tbody>{filteredUsers.map(person => <tr key={person._id}><td><div className="admin-item"><span className="admin-avatar admin-avatar-sage">{initials(person.name)}</span><strong>{person.name}</strong></div></td><td>{person.email}</td><td><span className={`badge ${person.role === 'admin' ? 'admin-badge-burgundy' : ''}`}>{person.role || 'Member'}</span></td><td>{date(person.createdAt)}</td><td><div className="admin-actions"><button className="btn btn-ghost" onClick={() => openChat(person)}><Icon name="message" size={16} />Message</button>{person._id !== user._id && person.role?.toLowerCase() !== 'admin' && <button className="admin-icon-button admin-danger" aria-label={`Remove ${person.name}`} onClick={() => setDeleteTarget({ kind: 'users', id: person._id, name: person.name })}><Icon name="trash" size={17} /></button>}</div></td></tr>)}</tbody></table></div>{!filteredUsers.length && <div className="admin-table-empty"><Icon name="user" size={28} /><h3>No members found.</h3><p>Try a different name or email address.</p></div>}</section>}
          {activeTab === 'Reports' && <div className="admin-report-list">{reports.map(report => <article className="panel admin-report" key={report._id}><div className="admin-report-main"><div className="admin-report-meta"><span className={`badge ${badge(report.status)}`}>{report.status || 'Pending'}</span><span>{date(report.createdAt)}</span></div><h2>{report.product?.title || 'Community report'}</h2><p className="muted">Reported member: <strong>{report.reportedUser?.name || 'Unavailable'}</strong></p><blockquote>{report.message}</blockquote></div>{report.status?.toLowerCase() === 'pending' ? <form className="admin-report-followup" onSubmit={event => { event.preventDefault(); resolve(report); }}><label className="field" htmlFor={`warning-${report._id}`}><span>Warning to member <small>(optional)</small></span><textarea id={`warning-${report._id}`} rows={3} value={warnings[report._id] || ''} onChange={event => setWarnings(current => ({ ...current, [report._id]: event.target.value }))} placeholder="Explain the issue and how to resolve it…" /></label><button className="btn btn-primary" disabled={busy === report._id}><Icon name="check" size={16} />{busy === report._id ? 'Resolving…' : 'Resolve report'}</button><p>Adding a message sends a warning to the member.</p></form> : <div className="admin-resolved-note"><Icon name="check-circle" size={24} /><span>Reviewed and resolved</span></div>}</article>)}{!reports.length && <section className="panel admin-table-empty"><Icon name="shield" size={32} /><h3>No community reports.</h3><p>Reports will appear here when a member flags a concern.</p></section>}</div>}
          {activeTab === 'Privacy & insights' && <AdminOperations preview={preview}/>}
          {activeTab === 'Activity' && <section className="panel admin-table-panel"><div className="admin-section-top"><div><h2>Moderation history</h2><p className="muted">{logs.length} recorded actions</p></div><Icon name="clock" size={20} /></div><div className="admin-table-scroll" role="region" aria-label="Scrollable data table" tabIndex={0}><table className="admin-table"><thead><tr><th>When</th><th>Administrator</th><th>Action</th><th>Details</th></tr></thead><tbody>{logs.map(log => <tr key={log._id}><td className="admin-date-cell">{date(log.timestamp || log.createdAt)}</td><td><strong>{log.adminId?.name || 'Administrator'}</strong></td><td><span className="badge admin-badge-burgundy">{log.action}</span></td><td className="admin-detail-cell">{log.details}</td></tr>)}</tbody></table></div>{!logs.length && <div className="admin-table-empty"><Icon name="clock" size={28} /><h3>No activity yet.</h3><p>Administrative actions will be recorded here.</p></div>}</section>}
        </>}
        <footer className="admin-footer"><span>QCU Buy & Sell · Community administration</span><span><Icon name="shield" size={13} /> A little care goes a long way.</span></footer>
      </div>
    </div>
    <Modal open={!!rejectTarget} onClose={()=>!busy&&setRejectTarget(null)} title="Reject this listing" description="Give the seller a clear reason so they know what needs to change."><form className="dialog-form" onSubmit={reject}><label className="field" htmlFor="listing-rejection">Reason for rejection<textarea id="listing-rejection" required minLength={10} maxLength={1000} rows={4} value={rejectionReason} onChange={event=>setRejectionReason(event.target.value)}/></label>{rejectionError&&<p className="inline-error" role="alert">{rejectionError}</p>}<button className="btn btn-primary" disabled={!!busy}>{busy?'Saving…':preview?'Preview rejection':'Reject listing'}</button></form></Modal>
    <Dialog open={Boolean(deleteTarget)} onClose={() => { if (!busy) setDeleteTarget(null); }} className="admin-dialog-root"><div className="admin-dialog-backdrop" /><div className="admin-dialog-position"><DialogPanel className="admin-confirm-panel"><div className="admin-confirm-icon"><Icon name="trash" size={25} /></div><DialogTitle>Remove {deleteTarget?.kind === 'products' ? 'this listing' : 'this member'}?</DialogTitle><p><strong>{deleteTarget?.name}</strong> will be removed from the marketplace.{preview ? ' This only affects the sample data in your preview.' : ' This action cannot be undone.'}</p><div className="admin-confirm-actions"><button className="btn btn-secondary" disabled={Boolean(busy)} onClick={() => setDeleteTarget(null)}>Keep {deleteTarget?.kind === 'products' ? 'listing' : 'member'}</button><button className="btn btn-primary" disabled={Boolean(busy)} onClick={confirmDelete}>{busy ? 'Removing…' : 'Remove'}</button></div></DialogPanel></div></Dialog>
    <Dialog transition open={isChatOpen} onClose={() => setIsChatOpen(false)} className="admin-dialog-root"><div className="admin-dialog-backdrop" /><div className="admin-dialog-position"><DialogPanel className="admin-chat-panel"><header className="admin-chat-top"><div><p className="eyebrow">COMMUNITY SUPPORT</p><DialogTitle>Support inbox</DialogTitle></div><button className="admin-icon-button" onClick={() => setIsChatOpen(false)} aria-label="Close support inbox"><Icon name="x" size={21} /></button></header>{preview && <div className="admin-chat-preview">Sample conversations · Messages stay in this preview</div>}<div className={`admin-chat-layout ${selectedChatUser ? 'has-selection' : ''}`}><aside className="admin-chat-people"><p>Campus members</p>{users.filter(person => person.role?.toLowerCase() !== 'admin').map(person => <button key={person._id} className={selectedChatUser?._id === person._id ? 'is-selected' : ''} onClick={() => { chatSelection.current++;chatRequest.current++;setChatMessage('');setSelectedChatUser(person); setMessages([]); setChatError(''); setMessageFeedback(''); setChatLoading(!preview); }}><span className="admin-avatar admin-avatar-sage">{initials(person.name)}</span><span><strong>{person.name}</strong><small>{person.email}</small></span></button>)}{!users.some(person => person.role?.toLowerCase() !== 'admin') && <div className="admin-chat-no-members">No members to contact yet.</div>}</aside><section className="admin-chat-conversation">{selectedChatUser ? <><div className="admin-chat-recipient"><button className="admin-chat-back admin-icon-button" onClick={() => setSelectedChatUser(null)} aria-label="Back to members"><Icon name="arrow-left" size={19} /></button><span className="admin-avatar">{initials(selectedChatUser.name)}</span><div><strong>{selectedChatUser.name}</strong><span>Marketplace support conversation</span></div></div><div className="admin-chat-messages" ref={chatContainer} role="log" aria-label="Conversation messages" aria-live="polite">{chatLoading && <p className="admin-chat-status">Loading conversation…</p>}{chatError && <p className="inline-error" role="alert">{chatError}</p>}{!chatLoading && !chatError && !messages.length && <div className="admin-chat-empty"><Icon name="message" size={30} /><p>Start the conversation.</p><span>Send a helpful message to this member.</span></div>}{messages.map((message, index) => <div key={message._id || index} className={`admin-message ${message.senderId === user._id ? 'is-mine' : ''}`}><p>{message.text}</p><time>{date(message.createdAt)}</time></div>)}</div><div className="admin-chat-composer-area">{messageFeedback && <p className="admin-message-feedback" role="status">{messageFeedback}</p>}<form className="admin-chat-composer" onSubmit={sendMessage}><label className="sr-only" htmlFor="admin-message">Message to {selectedChatUser.name}</label><input id="admin-message" value={chatMessage} onChange={event => setChatMessage(event.target.value)} placeholder="Write a helpful message…" autoComplete="off" maxLength={3000} /><button className="btn btn-primary" disabled={!chatMessage.trim() || busy === 'message'} aria-label={busy === 'message' ? 'Sending message' : 'Send message'}><Icon name="send" size={18} /></button></form></div></> : <div className="admin-chat-empty"><Icon name="message" size={35} /><h3>A helping hand starts here.</h3><p>Select a campus member to open a conversation.</p></div>}</section></div></DialogPanel></div></Dialog>
  </div>;
}
