import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import {useState,useEffect,useCallback,useRef} from 'react';
import {useRouter} from 'next/router';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import {useAuth} from '../../context/AuthContext';
import {formatPrice} from '../../lib/demo';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import ProductCard from '../../components/ProductCard';
export default function ProductPage(){const router=useRouter(),{user,isPreview}=useAuth();return router.isReady?<ProductDetails key={String(router.query.id)+':'+(user?._id||'guest')+':'+isPreview} id={String(router.query.id)}/>:<div className="page-shell empty-state" role="status"><span className="loading-ring"/>Loading your find…</div>;}
function ProductDetails({id}){
 const router=useRouter(),{user}=useAuth();
 const demo=false;
 const [liveProduct,setProduct]=useState(null),[busyLoading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[retry,setRetry]=useState(0);
 const [modal,setModal]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [buyForm,setBuyForm]=useState({meetupLocation:'',meetupTime:'',paymentMethod:'Cash',message:''});
 const [messages,setMessages]=useState([]),[newMessage,setNewMessage]=useState(''),[reportMessage,setReportMessage]=useState('');
 const [saved,setSaved]=useState(()=>{try{const value=typeof window==='undefined'?[]:JSON.parse(localStorage.getItem('qcu-saved-listings')||'[]');return Array.isArray(value)?value:[];}catch{return [];}});
 const toggleSave=id=>{const next=saved.includes(id)?saved.filter(s=>s!==id):[...saved,id];setSaved(next);try{localStorage.setItem('qcu-saved-listings',JSON.stringify(next));if(!saved.includes(id))toast.success('Saved on this device.');}catch{toast('Saved for this visit; device storage is unavailable.');}};
 const chatRef=useRef(null);
 const product=liveProduct,loading=!demo&&busyLoading;
 useEffect(()=>{
  if(demo)return;const controller=new AbortController();
  api.get('/products/'+id,{signal:controller.signal,timeout:8000}).then(r=>setProduct(r.data)).catch(e=>{if(e.code!=='ERR_CANCELED')setLoadError(e.response?.status===404?'This listing is no longer available.':'We couldn’t load this listing. Check your connection and try again.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[id,demo,retry]);
 const fetchMessages=useCallback(()=>{
  if(!product||!user||demo)return;
  return api.get('/transactions/messages/'+product.sellerId+'/'+product._id,{}).then(r=>setMessages(r.data)).catch(()=>setError('We couldn’t load the conversation. Close and reopen it to try again.'));
 },[product,user,demo]);
 useEffect(()=>{if(modal!=='chat'||demo)return;fetchMessages();const interval=setInterval(fetchMessages,5000);return()=>clearInterval(interval);},[modal,demo,fetchMessages]);
 useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[messages]);
 const openAction=action=>{
  if(!user){router.push('/login');return;}
  if(action==='buy'&&!demo&&product.status!=='Approved'){toast('This listing is not available for new meet-up requests.');return;}
  setError('');setModal(action);
 };
 const submitBuy=async e=>{
  e.preventDefault();setError('');
  if(!buyForm.meetupTime||new Date(buyForm.meetupTime)<=new Date()){setError('Choose a future date and time for your meet-up.');return;}
  if(demo){toast.success('Preview only: your request was not sent.');setModal(null);return;}
  setBusy(true);try{
   await api.post('/transactions/buy-request',{...buyForm,meetupTime:new Date(buyForm.meetupTime).toISOString(),productId:product._id},{});
   toast.success('Request sent. Keep an eye on your inbox.');setModal(null);
  }catch(error){setError(error.response?.data?.message||'Your request wasn’t sent. Check your connection and try again.');}finally{setBusy(false);}
 };
 const sendMessage=async e=>{
  e.preventDefault();if(!newMessage.trim()||busy)return;setError('');
  if(demo){setMessages([...messages,{_id:'local-'+Date.now(),senderId:user?._id,text:newMessage.trim()}]);setNewMessage('');toast.success('Preview only: message added locally.');return;}
  setBusy(true);try{await api.post('/transactions/messages',{receiverId:product.sellerId,productId:product._id,text:newMessage.trim()},{});setNewMessage('');await fetchMessages();}catch{setError('Message wasn’t sent. Try again.');}finally{setBusy(false);}
 };
 const submitReport=async e=>{
  e.preventDefault();if(!reportMessage.trim())return;setError('');
  if(demo){toast.success('Preview only: no report was submitted.');setModal(null);setReportMessage('');return;}
  setBusy(true);try{await api.post('/reports',{product:product._id,reportedUser:product.sellerId,message:reportMessage.trim()},{});toast.success('Report sent for admin review.');setModal(null);setReportMessage('');}catch{setError('Your report wasn’t sent. Please try again.');}finally{setBusy(false);}
 };
 if(loading)return <div className="page-shell empty-state" role="status"><span className="loading-ring"/>Finding the details…</div>;
 if(!product)return <div className="page-shell empty-state"><Icon name="box"/><h1 className="page-heading">{loadError||'This find is no longer here.'}</h1><p>There are more good finds waiting for you on campus.</p><div className="dialog-actions"><Link href="/browse" className="btn btn-primary">Back to marketplace</Link>{loadError&&<button className="btn btn-secondary" onClick={()=>{setLoadError('');setLoading(true);setRetry(retry+1);}}>Try again</button>}</div></div>;
 const ownListing=user?._id===product.sellerId;
 const related=[];
 return <div className="page-shell product-page"><Head><title>{product.title} | QCU Marketplace</title></Head><Link href="/browse" className="back-link"><Icon name="arrow-left" size={15}/>Back to good finds</Link>
 <div className="product-detail-grid"><div><div className="detail-photo">{product.image?<Image src={product.image} width={700} height={700} alt={product.title} unoptimized priority/>:<Icon name="box" size={60}/>}</div><p className="detail-photos-note"><Icon name={demo?'eye':'camera'} size={14}/>{demo?'Illustrated sample listing · Not for sale':'Photo provided by the seller'}</p><Link className="detail-safety" href="/safety"><Icon name="shield" size={20}/><span><strong>A good find starts with a safe meet-up.</strong>Meet on campus, inspect the item, and pay only when you’re happy with it.</span><Icon name="arrow-up-right" size={15}/></Link></div>
 <section className="detail-content"><div className="detail-badges"><span className="badge">{product.category}</span><span className="badge badge-success">{product.condition||'Pre-loved'}</span>{demo&&<span className="badge">Sample</span>}</div><h1>{product.title}</h1><p className="detail-price">{formatPrice(product.price)}</p><p className="detail-description">{product.description||'Ask the seller for more details about this item.'}</p><dl className="detail-meta"><div><dt>Campus meet-up</dt><dd>{product.location||'Arrange with the seller'}</dd></div><div><dt>Seller warranty</dt><dd>{product.warrantyTerms||'No additional seller warranty stated. Applicable legal rights still apply.'}</dd></div><div><dt>Listed</dt><dd>{product.createdAt?new Date(product.createdAt).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}):'Recently'}</dd></div></dl>
 <div className="detail-seller"><span>{product.sellerName?.[0]||'Q'}</span><span><strong>{product.sellerName||'QCU seller'}</strong><small>Marketplace member · Enrollment not verified</small></span><Icon name="user" size={19}/></div>
 {ownListing?<div className="panel empty-state" style={{padding:22}}><Icon name="store" size={24}/><h3>This one’s yours.</h3><p>Keep your item details up to date and manage interested buyers from your listings.</p><Link href="/my-listings" className="btn btn-primary">Manage listing<Icon name="arrow-right" size={16}/></Link></div>:<><div className="detail-actions"><button className="btn btn-primary" onClick={()=>openAction('buy')}>Arrange a meet-up<Icon name="arrow-right" size={16}/></button><button className="btn btn-secondary" onClick={()=>openAction('chat')}><Icon name="message" size={17}/>Message seller</button></div><button className="detail-report" onClick={()=>openAction('report')}><Icon name="alert" size={12}/>Report this listing</button></>}
 </section></div>
 {demo&&<section className="detail-related"><h2>More campus favorites</h2><div className="product-grid">{related.map(p=><ProductCard product={p} key={p._id} saved={saved.includes(p._id)} onSave={toggleSave}/>)}</div></section>}
 <Modal open={modal==='buy'} onClose={()=>!busy&&setModal(null)} title="Let’s find a time." description={demo?'Design preview: no purchase or request will be sent.':'Send a meet-up request. You can agree on the final details with the seller.'}><form onSubmit={submitBuy} className="dialog-form"><div className="dialog-product">{product.image&&<Image src={product.image} width={54} height={54} alt="" unoptimized/>}<div><strong>{product.title}</strong><span>{formatPrice(product.price)}</span></div></div><div className="field"><label htmlFor="meetup-location">Meet-up location</label><input id="meetup-location" placeholder="e.g. QCU library entrance" maxLength={180} required value={buyForm.meetupLocation} onChange={e=>setBuyForm({...buyForm,meetupLocation:e.target.value})}/></div><div className="field"><label htmlFor="meetup-time">Preferred date & time</label><input id="meetup-time" type="datetime-local" required value={buyForm.meetupTime} onChange={e=>setBuyForm({...buyForm,meetupTime:e.target.value})}/></div><div className="field"><label htmlFor="meetup-payment">Payment method</label><select id="meetup-payment" value={buyForm.paymentMethod} onChange={e=>setBuyForm({...buyForm,paymentMethod:e.target.value})}><option>Cash</option><option>GCash at meet-up</option><option>Maya at meet-up</option></select></div><p className="field-hint">Payment is made directly to the seller at meet-up after inspection. This website does not hold money. <Link href="/refunds">Read warranty and refund guidance</Link>.</p><div className="field"><label htmlFor="meetup-note">A note for the seller <span className="muted">(optional)</span></label><textarea id="meetup-note" maxLength={500} rows={2} value={buyForm.message} onChange={e=>setBuyForm({...buyForm,message:e.target.value})}/></div>{error&&<p className="inline-error" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" className="btn btn-secondary" onClick={()=>setModal(null)} disabled={busy}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy?'Sending…':demo?'Preview meet-up request':'Send meet-up request'}</button></div></form></Modal>
 <Modal open={modal==='chat'} onClose={()=>setModal(null)} title={'Chat with '+(product.sellerName?.split(' ')[0]||'seller')}>{demo&&<p className="chat-preview-note">Design preview. Messages stay on this screen.</p>}<div className="product-chat-log" ref={chatRef} role="log" aria-label="Conversation" aria-live="polite">{messages.length===0?<div className="empty-state" style={{padding:25}}><Icon name="message" size={27}/><p>Say hello. Ask about the item, or find a time to meet on campus.</p></div>:messages.map((m,i)=><div key={m._id||i} className={'chat-bubble '+(m.senderId===user?._id?'own':'')}>{m.text}</div>)}</div>{error&&<p className="inline-error" role="alert">{error}</p>}<form onSubmit={sendMessage} className="product-chat-input"><label htmlFor="seller-message" className="sr-only">Message to seller</label><input className="input-control" id="seller-message" placeholder="Say hello…" value={newMessage} maxLength={2000} onChange={e=>setNewMessage(e.target.value)}/><button className="btn btn-primary" aria-label="Send message" disabled={busy||!newMessage.trim()}><Icon name="send" size={17}/></button></form></Modal>
 <Modal open={modal==='report'} onClose={()=>!busy&&setModal(null)} title="Report this listing" description={demo?'Design preview: this report will not be submitted.':'Help keep the marketplace safe. The admin team will review your report.'}><form onSubmit={submitReport} className="dialog-form"><div className="field"><label htmlFor="report-reason">What seems wrong?</label><textarea id="report-reason" required value={reportMessage} maxLength={2000} placeholder="Describe the issue with this listing…" onChange={e=>setReportMessage(e.target.value)}/></div>{error&&<p className="inline-error" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" className="btn btn-secondary" disabled={busy} onClick={()=>setModal(null)}>Cancel</button><button className="btn btn-primary" disabled={busy||!reportMessage.trim()}>{busy?'Submitting…':demo?'Preview report':'Submit report'}</button></div></form></Modal>
 </div>;
}

export async function getServerSideProps({ params }) {
  if (!/^[a-f\d]{24}$/i.test(params.id)) return { notFound: true };
  return { props: {} };
}
