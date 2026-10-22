import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';
import TransactionActions from './TransactionActions';
import { EmptyBlock, LoadingBlock, StatusBadge } from './WorkspaceUI';
import { demoProducts, formatPrice } from '../lib/demo';

function threadKey(thread) { return thread?._id || (thread?.isAdminThread ? 'admin-support' : thread?.productId); }
function otherName(thread, userId) { return thread.isAdminThread ? 'Marketplace support' : thread.buyerId === userId ? thread.sellerName || 'Seller' : thread.buyerName || 'Buyer'; }
function initials(name = '') { return name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'QC'; }
function meetupTime(value) { const date = new Date(value); return !value || Number.isNaN(date.getTime()) ? 'Arrange in the conversation' : date.toLocaleString('en-PH', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' }); }
function messageTime(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' }); }

const sampleProduct = demoProducts.find((item) => item.sellerId !== 'preview-student') || demoProducts[0];
const ownProduct = demoProducts.find((item) => item.sellerId === 'preview-student') || demoProducts[1];
const previewTransactions = {
  purchases: [{ _id: 'preview-purchase', productId: sampleProduct?._id, productTitle: sampleProduct?.title || 'Campus essentials', price: sampleProduct?.price || 250, buyerId: 'preview-student', buyerName: 'Alex Reyes', sellerId: 'preview-mia', sellerName: 'Mia Santos', status: 'Accepted', meetupLocation: 'QCU main library entrance', meetupTime: '2026-10-23T05:00:00.000Z', paymentMethod: 'Cash' }],
  sales: [{ _id: 'preview-sale', productId: ownProduct?._id, productTitle: ownProduct?.title || 'Pre-loved textbook', price: ownProduct?.price || 180, buyerId: 'preview-daniel', buyerName: 'Daniel Cruz', sellerId: 'preview-student', sellerName: 'Alex Reyes', status: 'Pending', meetupLocation: 'QCU campus', paymentMethod: 'Cash' }],
  adminThread: { _id: 'preview-support', isAdminThread: true, productTitle: 'Marketplace support', status: 'Marketplace support' },
};
const initialPreviewMessages = {
  'preview-purchase': [
    { _id: 'pm-1', senderId: 'preview-student', text: 'Hi Mia! Is this still available? I can meet you on campus tomorrow.', createdAt: '2026-10-22T02:02:00Z' },
    { _id: 'pm-2', senderId: 'preview-mia', text: 'Hi Alex! Yes, it is. Would the main library entrance at 1 PM work for you?', createdAt: '2026-10-22T02:05:00Z' },
    { _id: 'pm-3', senderId: 'preview-student', text: 'That works! I’ll bring cash. Thank you.', createdAt: '2026-10-22T02:06:00Z' },
    { _id: 'pm-4', senderId: 'preview-mia', text: 'Perfect. See you there! Feel free to check the item before we settle.', createdAt: '2026-10-22T02:07:00Z' },
  ],
  'preview-sale': [{ _id: 'sm-1', senderId: 'preview-daniel', text: 'Hi Alex! I’m interested in your listing. Is there anything I should know about its condition?', createdAt: '2026-10-22T01:40:00Z' }],
  'preview-support': [{ _id: 'am-1', senderId: 'admin', text: 'Welcome to your campus marketplace. If you need help with a listing or a transaction, you can reach the admin team here.', createdAt: '2026-10-22T00:30:00Z' }],
};
const emptyMessages = [];

export default function InboxWorkspace() {
  const { user, loading: authLoading, isPreview } = useAuth();
  const [liveTransactions, setTransactions] = useState({ purchases: [], sales: [] });
  const [selectedThread, setSelectedTx] = useState(null);
  const [activeTab, setActiveTab] = useState('All messages');
  const [search, setSearch] = useState('');
  const [liveMessages, setMessages] = useState([]);
  const [previewMessages, setPreviewMessages] = useState(initialPreviewMessages);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [sending, setSending] = useState(false);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const chatRef = useRef(null);
  const composeRef = useRef(null);
  const messageRequest=useRef(0);
  const threadSelection=useRef(0);
  const invalidateMessageRequests=useCallback(()=>{messageRequest.current++;},[]);
  const transactions = isPreview ? previewTransactions : liveTransactions;
  const freshThreads=[...(transactions.purchases||[]),...(transactions.sales||[]),...(transactions.adminThread?[transactions.adminThread]:[])];
  const selectedTx = freshThreads.find(thread=>threadKey(thread)===threadKey(selectedThread)) || selectedThread || (isPreview ? previewTransactions.purchases[0] : null);
  const messages = isPreview ? previewMessages[threadKey(selectedTx)] || emptyMessages : liveMessages;

  const loadTransactions = useCallback(() => {
    if (!user || isPreview) return;
    return api.get('/transactions/my-transactions', { }).then((response) => {
      setTransactions(response.data || { purchases: [], sales: [] });
      setError('');
    }).catch(() => setError('Your conversations could not be loaded. Check the connection and try again.'))
      .finally(() => setLoading(false));
  }, [user, isPreview]);

  useEffect(() => {
    if (!user) return;
    loadTransactions();
    if (!isPreview) { const interval = setInterval(loadTransactions, 5000); return () => clearInterval(interval); }
  }, [user, isPreview, loadTransactions]);

  const loadMessages = useCallback(() => {
    if (!selectedTx || !user || isPreview) return;
    const request=++messageRequest.current;
    const productId = selectedTx.isAdminThread ? 'null' : selectedTx.productId;
    const otherId = selectedTx.isAdminThread ? 'admin' : selectedTx.buyerId === user._id ? selectedTx.sellerId : selectedTx.buyerId;
    return api.get(`/transactions/messages/${otherId}/${productId}`, { }).then((response) => {
      if(request!==messageRequest.current)return;
      setMessages(Array.isArray(response.data) ? response.data : []);
      setMessageError('');
    }).catch(() => {if(request===messageRequest.current)setMessageError('Messages could not be loaded. Try again in a moment.');})
      .finally(() => {if(request===messageRequest.current)setMessagesLoading(false);});
  }, [selectedTx, user, isPreview]);

  useEffect(() => {
    loadMessages();
    if (selectedTx && !isPreview) { const interval = setInterval(loadMessages, 3000); return () => {clearInterval(interval);invalidateMessageRequests();}; }
  }, [selectedTx, isPreview, loadMessages, invalidateMessageRequests]);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages, mobileThreadOpen]);

  async function sendMessage(event) {
    event.preventDefault();
    const text = newMessage.trim();
    if (!text || !selectedTx || sending) return;
    const selection=threadSelection.current;
    setSending(true);
    setMessageError('');
    try {
      if (isPreview) {
        const key = threadKey(selectedTx);
        setPreviewMessages((previous) => ({ ...previous, [key]: [...(previous[key] || []), { _id: `local-${Date.now()}`, senderId: user._id, text, createdAt: new Date().toISOString() }] }));
        toast.success('Preview only: this message was not sent.');
      } else {
        await api.post('/transactions/messages', { receiverId: selectedTx.isAdminThread ? 'admin' : selectedTx.buyerId === user._id ? selectedTx.sellerId : selectedTx.buyerId, productId: selectedTx.isAdminThread ? null : selectedTx.productId, text }, { });
        if(selection!==threadSelection.current)return;
        await loadMessages();
      }
      if(selection!==threadSelection.current)return;
      setNewMessage(current=>current.trim()===text?'':current);
      composeRef.current?.focus();
    } catch { if(selection===threadSelection.current)setMessageError('Your message was not sent. Your text is still here so you can try again.');else toast.error('Your message to the previous conversation was not sent. Open it to try again.'); }
    finally { setSending(false); }
  }

  function selectThread(thread) {
    threadSelection.current++;
    messageRequest.current++;
    const changed = threadKey(thread) !== threadKey(selectedTx);
    setSelectedTx(thread);
    setMobileThreadOpen(true);
    setMessageError('');
    if (changed) { setMessages([]); setNewMessage(''); setMessagesLoading(!isPreview); }
  }

  const purchases = transactions.purchases || [];
  const sales = transactions.sales || [];
  const allThreads = [...purchases, ...sales, ...(transactions.adminThread ? [transactions.adminThread] : [])];
  const threads = (activeTab === 'Buying' ? purchases : activeTab === 'Selling' ? sales : allThreads).filter((thread) => `${thread.productTitle} ${otherName(thread, user?._id)}`.toLowerCase().includes(search.toLowerCase()));
  const selectedName = selectedTx ? otherName(selectedTx, user?._id) : '';

  return (
    <div className={`page-shell workspace-page ws-inbox-page ${mobileThreadOpen ? 'ws-mobile-conversation' : ''}`}>
      <Head><title>Inbox | QCU Buy & Sell</title></Head>
      <div className="ws-page-top"><div><p className="eyebrow">FROM A GOOD FIND TO A GOOD MEETUP</p><h1 className="page-heading">Messages &amp; meetups<span className="ws-heading-dot">.</span></h1><p className="muted">Ask a question. Talk details. Make a campus connection.</p></div><Link href="/browse" className="btn btn-secondary">Explore the marketplace <Icon name="arrow-up-right" size={17} /></Link></div>
      <div className={`panel ws-inbox ${mobileThreadOpen ? 'ws-thread-open' : ''}`}>
        <section className="ws-thread-sidebar" aria-label="Your conversations">
          <div className="ws-inbox-sidebar-head"><div><h2>Conversations</h2><span className="badge">{allThreads.length}</span></div><label className="ws-search"><Icon name="search" size={17} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations…" aria-label="Search conversations" /></label><div className="ws-tabs ws-inbox-tabs" aria-label="Filter conversations">{['All messages', 'Buying', 'Selling'].map((tab) => <button key={tab} className={activeTab === tab ? 'is-active' : ''} aria-pressed={activeTab === tab} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div></div>
          <div className="ws-thread-list">{authLoading || (!isPreview && loading) ? <LoadingBlock text="Opening your inbox…" /> : error ? <EmptyBlock icon="alert" title="Could not open your inbox" text={error} action={<button className="btn btn-secondary" onClick={loadTransactions}>Try again</button>} /> : !threads.length ? <EmptyBlock icon="message" title={search ? 'No conversations found' : 'Nothing here just yet'} text={search ? 'Try a different name or item.' : 'Message a seller or receive an inquiry to start a conversation.'} /> : threads.map((thread) => <button className={`ws-thread ${threadKey(selectedTx) === threadKey(thread) ? 'is-selected' : ''}`} key={threadKey(thread)} onClick={() => selectThread(thread)} aria-pressed={threadKey(selectedTx) === threadKey(thread)}><div className={`ws-thread-avatar ${thread.isAdminThread ? 'ws-admin-avatar' : ''}`}>{thread.isAdminThread ? <Icon name="shield" size={20} /> : initials(otherName(thread, user?._id))}</div><span className="ws-thread-copy"><span className="ws-thread-title"><strong>{otherName(thread, user?._id)}</strong>{thread.isAdminThread && <Icon name="check-circle" size={14} />}</span><span className="ws-thread-product">{thread.productTitle}</span><span className="ws-thread-type">{thread.isAdminThread ? 'Marketplace support' : thread.buyerId === user?._id ? 'You are buying' : 'You are selling'} <span>·</span> {thread.status}</span></span><Icon name="chevron-down" className="ws-thread-chevron" size={15} /></button>)}</div>
          <div className="ws-inbox-security"><Icon name="shield" size={20} /><span>Keep the conversation here.<br />Meet in a public campus spot.</span></div>
        </section>
        <section className="ws-conversation" aria-label={selectedTx ? `Conversation with ${selectedName}` : 'Conversation'}>
          {selectedTx ? <>
            <header className="ws-conversation-head"><button className="ws-icon-button ws-inbox-back" onClick={() => setMobileThreadOpen(false)} aria-label="Back to conversations"><Icon name="arrow-left" /></button><div className="ws-thread-avatar">{selectedTx.isAdminThread ? <Icon name="shield" size={20} /> : initials(selectedName)}</div><div><h2>{selectedName}</h2><p>{selectedTx.isAdminThread ? 'Marketplace administration' : selectedTx.buyerId === user?._id ? 'Seller · Marketplace member' : 'Buyer · Marketplace member'}</p></div><span className="ws-conversation-status">{selectedTx.isAdminThread ? <span className="badge badge-success">Marketplace support</span> : <StatusBadge status={selectedTx.status} context="transaction" />}</span></header>
            {!selectedTx.isAdminThread && <><div className="ws-conversation-item"><div><span className="ws-conversation-item-icon"><Icon name="box" size={24} /></span><span><strong>{selectedTx.productTitle}</strong><small>{selectedTx.buyerId === user?._id ? 'You are buying this item' : 'You are selling this item'}</small></span></div><div className="ws-conversation-item-actions"><strong>{formatPrice(selectedTx.price)}</strong>{selectedTx.productId && <Link className="ws-text-link" href={`/product/${selectedTx.productId}`}>View item <Icon name="arrow-up-right" size={18} /></Link>}</div></div><details className="ws-transaction-details"><summary><Icon name="pin" size={20} /><span>Meetup &amp; transaction details</span><Icon name="chevron-down" size={20} /></summary><dl><div><dt>Meetup location</dt><dd>{selectedTx.meetupLocation || 'Arrange in the conversation'}</dd></div><div><dt>Meetup time</dt><dd>{meetupTime(selectedTx.meetupTime)}</dd></div><div><dt>Payment</dt><dd>{selectedTx.paymentMethod || 'Agree with the other person'}</dd></div><div><dt>Transaction status</dt><dd>{selectedTx.status || 'Pending'}</dd></div>{selectedTx.message && <div className="ws-transaction-note"><dt>Buyer’s note</dt><dd>{selectedTx.message}</dd></div>}</dl></details><details className="ws-transaction-details"><summary><Icon name="shield" size={20}/><span>Manage handover, warranty &amp; refunds</span><Icon name="chevron-down" size={20}/></summary><TransactionActions key={selectedTx._id} transaction={selectedTx} user={user} preview={isPreview} onUpdated={loadTransactions}/></details></>}
            <div className="ws-chat-messages" ref={chatRef} role="log" aria-live="polite" aria-label="Messages">{messagesLoading ? <LoadingBlock text="Loading the conversation…" /> : messages.length ? <><p className="ws-chat-divider">{isPreview ? 'Sample conversation' : 'Your conversation'}</p>{messages.map((message, index) => <div className={`ws-message-row ${message.senderId === user?._id ? 'is-own' : ''}`} key={message._id || index}><div className="ws-message-bubble"><p>{message.text}</p><time dateTime={message.createdAt}>{messageTime(message.createdAt)}</time></div></div>)}</> : <EmptyBlock icon="message" title="Say hello" text="Ask about the item or suggest a convenient place to meet on campus." />}</div>
            <div className="ws-chat-bottom">{messageError && <div className="inline-error ws-message-error" role="alert">{messageError}<button type="button" onClick={loadMessages}>Retry loading</button></div>}<form className="ws-chat-compose" onSubmit={sendMessage}><label className="sr-only" htmlFor="chat-message">Your message</label><textarea id="chat-message" ref={composeRef} rows={2} value={newMessage} maxLength={3000} onChange={(event) => setNewMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} placeholder={isPreview ? 'Try a message in preview…' : 'Write your message…'} aria-describedby="chat-compose-help" /><div className="ws-compose-toolbar"><span id="chat-compose-help">Enter to send <span aria-hidden="true">·</span> Shift + Enter for a new line</span><button className="btn btn-primary" type="submit" disabled={!newMessage.trim() || sending} aria-label={isPreview ? 'Preview message' : 'Send message'}><span>{sending ? 'Sending…' : isPreview ? 'Preview message' : 'Send message'}</span><Icon name="send" size={20} /></button></div></form><p className="ws-compose-note">{isPreview ? 'Design preview · Messages stay in this browser view.' : 'Keep personal information private. Meet in a public place on campus.'}</p></div>
          </> : <div className="ws-conversation-empty"><div className="ws-chat-illustration"><span /><Icon name="message" size={42} /><span /></div><p className="eyebrow">YOUR CAMPUS CONNECTIONS START HERE</p><h2>A good deal starts with hello.</h2><p>Choose a conversation to ask about an item or plan your next campus meetup.</p><Link href="/browse" className="btn btn-secondary">Find something you love <Icon name="arrow-up-right" size={17} /></Link></div>}
        </section>
      </div>
    </div>
  );
}


