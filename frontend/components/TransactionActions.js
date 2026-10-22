import {useState} from 'react';
import Link from 'next/link';
import api from '../lib/api';
import Icon from './Icon';
import {formatPrice} from '../lib/demo';

export default function TransactionActions({transaction, user, preview, onUpdated}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[feedback,setFeedback]=useState('');
 const [requestOpen,setRequestOpen]=useState(false),[reason,setReason]=useState(''),[amount,setAmount]=useState('');
 const [responses,setResponses]=useState({}),[localDisputes,setLocalDisputes]=useState([]),[localStatus,setLocalStatus]=useState('');
 const isSeller=transaction.sellerId===user?._id;
 const status=preview&&localStatus?localStatus:transaction.status;
 const disputes=preview?localDisputes:transaction.disputes||[];
 if(transaction.isAdminThread||transaction.isInquiry||!['Pending','Accepted','Completed','Cancelled'].includes(status))return null;
 async function run(action,success){
  setBusy(true);setError('');setFeedback('');
  try {await action();if(!preview)await onUpdated();setFeedback(preview?'Preview only. No live record or payment changed.':success);}
  catch(error){setError(error.response?.data?.message||'The update could not be saved. Please try again.');}
  finally{setBusy(false);}
 }
 function updateStatus(next){run(async()=>{if(preview)setLocalStatus(next);else await api.patch(`/transactions/${transaction._id}/status`,{status:next});},'Handover status updated. Payment is recorded separately between the parties.');}
 async function submitRequest(event){
  event.preventDefault();
  await run(async()=>{
   const refund=!isSeller&&status==='Completed';
   const payload={type:refund?'refund':'dispute',reason:reason.trim(),amount:refund?Number(amount):0};
   if(preview)setLocalDisputes(current=>[...current,{...payload,_id:'preview-'+Date.now(),status:'open',reviewStatus:'pending'}]);
   else await api.post(`/transactions/${transaction._id}/disputes`,payload);
   setReason('');setAmount('');setRequestOpen(false);
  },'Your request was recorded for the seller and marketplace moderators. No money was moved.');
 }
 function respond(dispute,next){run(async()=>{
  const response=responses[dispute._id]?.trim();
  if(!response)throw {response:{data:{message:'Add a response explaining the decision or confirming the direct refund.'}}};
  if(preview)setLocalDisputes(current=>current.map(item=>item._id===dispute._id?{...item,status:next,response}:item));
  else await api.patch(`/transactions/${transaction._id}/disputes/${dispute._id}`,{status:next,response});
 },next==='refunded'?'Direct refund recorded by the seller. This website has not verified or transferred the money.':'Your response was saved. No payment was processed.');}
 return <section className="transaction-actions" aria-label="Handover and warranty actions">
  <div className="transaction-action-heading"><Icon name="shield" size={20}/><div><strong>Handover &amp; seller warranty</strong><p>{transaction.warrantyTerms||'No additional seller warranty stated. Applicable legal rights still apply.'}</p></div></div>
  <p className="field-hint">Pay the seller directly after inspection at meet-up. This website does not collect, hold, verify, or refund payments. <Link href="/refunds">Refund guidance</Link>.</p>
  <div className="transaction-action-buttons">
   {isSeller&&status==='Pending'&&<button className="btn btn-primary" disabled={busy} onClick={()=>updateStatus('Accepted')}>Accept meet-up</button>}
   {isSeller&&status==='Accepted'&&<button className="btn btn-primary" disabled={busy} onClick={()=>updateStatus('Completed')}>Record completed handover</button>}
   {['Pending','Accepted'].includes(status)&&<button className="btn btn-secondary" disabled={busy} onClick={()=>updateStatus('Cancelled')}>Cancel request</button>}
   {['Accepted','Completed'].includes(status)&&<button className="btn btn-secondary" disabled={busy} onClick={()=>setRequestOpen(!requestOpen)} aria-expanded={requestOpen}>{isSeller?'Raise a dispute':status==='Completed'?'Request a refund / report an issue':'Report a meet-up issue'}</button>}
  </div>
  {requestOpen&&<form className="transaction-request-form" onSubmit={submitRequest}>
   <div className="field"><label htmlFor="warranty-reason">{isSeller?'What happened?':status==='Completed'?'Reason for your refund request':'Describe the meet-up issue'}</label><textarea id="warranty-reason" required minLength={10} maxLength={2000} rows={3} value={reason} onChange={event=>setReason(event.target.value)} aria-describedby="warranty-sharing"/></div>
   {!isSeller&&status==='Completed'&&<div className="field"><label htmlFor="refund-amount">Requested amount (₱)</label><input id="refund-amount" type="number" required min="0.01" max={transaction.price} step="0.01" value={amount} onChange={event=>setAmount(event.target.value)}/></div>}
   <p id="warranty-sharing" className="field-hint">The reason is shared with the other participant and marketplace moderators to review the issue. Describe the item, defect, and agreed warranty; avoid ID numbers, passwords, or payment credentials.</p>
   <button className="btn btn-primary" disabled={busy}>{busy?'Saving…':preview?'Preview request':'Submit request'}</button>
  </form>}
  {disputes.length>0&&<div className="transaction-disputes">{disputes.map(dispute=><article key={dispute._id}>
   <div className="transaction-dispute-top"><strong>{dispute.type==='refund'?'Refund request':'Dispute'}{dispute.amount>0?' · '+formatPrice(dispute.amount):''}</strong><span className="badge">{dispute.status==='refunded'?'Seller recorded refund paid':dispute.status}</span></div>
   <p>{dispute.reason}</p>{dispute.response&&<p><strong>Seller response:</strong> {dispute.response}</p>}
   {dispute.adminNote&&<p><strong>Moderator review:</strong> {dispute.adminNote}</p>}
   {isSeller&&['open','accepted'].includes(dispute.status)&&<div className="transaction-response"><div className="field"><label htmlFor={'seller-response-'+dispute._id}>Response to the request</label><textarea id={'seller-response-'+dispute._id} rows={2} maxLength={2000} value={responses[dispute._id]||''} onChange={event=>setResponses({...responses,[dispute._id]:event.target.value})}/></div><div className="transaction-action-buttons">{dispute.status==='open'?<><button className="btn btn-secondary" disabled={busy} onClick={()=>respond(dispute,'accepted')}>Accept request</button><button className="btn btn-secondary" disabled={busy} onClick={()=>respond(dispute,'rejected')}>Decline with reason</button></>:<button className="btn btn-secondary" disabled={busy} onClick={()=>respond(dispute,'refunded')}>Record refund paid directly</button>}</div></div>}
  </article>)}</div>}
  {feedback&&<p role="status" className="transaction-feedback">{feedback}</p>}
  {error&&<p role="alert" className="inline-error">{error}</p>}
 </section>;
}
