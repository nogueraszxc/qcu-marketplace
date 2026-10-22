import {useCallback,useEffect,useState} from 'react';
import api,{apiError} from '../lib/api';
import {formatPrice} from '../lib/demo';
import Icon from './Icon';

export default function AdminOperations({preview}) {
 const [data,setData]=useState({privacy:[],disputes:[],analytics:[]}),[loading,setLoading]=useState(!preview),[error,setError]=useState(''),[busy,setBusy]=useState(''),[drafts,setDrafts]=useState({}),[feedback,setFeedback]=useState('');
 const load=useCallback(async()=>{
  if(preview)return;
  setLoading(true);setError('');
  try{const results=await Promise.all(['privacy-requests','disputes','analytics'].map(path=>api.get('/admin/'+path)));setData({privacy:results[0].data,disputes:results[1].data,analytics:results[2].data});}
  catch(error){setError(apiError(error,'These records could not be loaded.'));}finally{setLoading(false);}
 },[preview]);
 useEffect(()=>{const controller=new AbortController();Promise.resolve().then(()=>{if(!controller.signal.aborted)load();});return()=>controller.abort();},[load]);
 async function update(kind,id,payload){
  setBusy(id);setError('');setFeedback('');
  try{if(!preview){await api.patch(`/admin/${kind}/${id}`,payload);await load();}setFeedback(preview?'Preview only. No live record changed.':'Review saved. This does not process a payment or automatically fulfill a privacy request.');}
  catch(error){setError(apiError(error));}finally{setBusy('');}
 }
 const [section,setSection]=useState('privacy');
 const visits=data.analytics.reduce((sum,row)=>sum+row.count,0);
 return <div className="implementation-admin-cards">
  <nav className="admin-ops-navigation" aria-label="Privacy and resolution sections">{[['privacy','Privacy requests',data.privacy.length,'shield'],['disputes','Warranty & disputes',data.disputes.length,'message'],['analytics','Page insights',visits,'chart']].map(([key,label,count,icon])=><button type="button" key={key} onClick={()=>setSection(key)} aria-pressed={section===key}><Icon name={icon} size={18}/><span>{label}</span><small>{count}</small></button>)}</nav>
  {error&&<div className="inline-error" role="alert">{error}<button className="btn btn-secondary" onClick={load}>Retry</button></div>}
  {feedback&&<p role="status">{feedback}</p>}
  {loading?<p role="status">Loading privacy and dispute records…</p>:<>
   {section==='privacy'&&<section className="panel implementation-admin-card"><h2>Privacy requests</h2><p className="muted">Review and fulfill the request before recording a resolution. Access, correction, deletion, and objection requests are private to the member and marketplace moderators.</p>
    {!data.privacy.length&&<p>No privacy requests {preview?'in this preview':'have been submitted'}.</p>}
    {data.privacy.map(request=><article key={request._id} className="implementation-case"><h3>{request.type} · {request.userId?.name||'Deleted account'}</h3><p className="muted">{request.userId?.email}</p><span className="badge">{request.status}</span><p>{request.message}</p>{request.response&&<p><strong>Resolution:</strong> {request.response}</p>}{request.status==='open'&&<form onSubmit={event=>{event.preventDefault();update('privacy-requests',request._id,{status:'resolved',response:drafts[request._id]});}}><label className="field" htmlFor={'privacy-response-'+request._id}>Actions taken and response<textarea id={'privacy-response-'+request._id} required minLength={10} maxLength={2000} rows={3} value={drafts[request._id]||''} onChange={event=>setDrafts({...drafts,[request._id]:event.target.value})}/></label><button className="btn btn-primary" disabled={busy===request._id}>{busy===request._id?'Saving…':'Record fulfilled request'}</button></form>}</article>)}
   </section>}
   {section==='disputes'&&<section className="panel implementation-admin-card"><h2>Warranty and refund disputes</h2><p className="muted">Review the original warranty and participant responses. Moderators cannot transfer money or mark a refund as paid.</p>
    {!data.disputes.length&&<p>No disputes {preview?'in this preview':'have been submitted'}.</p>}
    {data.disputes.map(dispute=><article key={dispute._id} className="implementation-case"><h3>{dispute.transactionId?.productTitle||'Transaction dispute'}</h3><span className="badge">{dispute.status==='refunded'?'Seller recorded refund paid':dispute.status}</span><span className="badge">Review: {dispute.reviewStatus}</span><p>{dispute.reason}</p><p><strong>Requested:</strong> {formatPrice(dispute.amount)} · <strong>Warranty snapshot:</strong> {dispute.transactionId?.warrantyTerms||'Unavailable'}</p>{dispute.response&&<p><strong>Seller response:</strong> {dispute.response}</p>}{dispute.adminNote&&<p><strong>Moderator note:</strong> {dispute.adminNote}</p>}<form onSubmit={event=>{event.preventDefault();update('disputes',dispute._id,{reviewStatus:'closed',adminNote:drafts[dispute._id]});}}><label className="field" htmlFor={'dispute-review-'+dispute._id}>Review note<textarea id={'dispute-review-'+dispute._id} rows={3} required minLength={10} maxLength={2000} value={drafts[dispute._id]||''} onChange={event=>setDrafts({...drafts,[dispute._id]:event.target.value})}/></label><div className="transaction-action-buttons"><button className="btn btn-secondary" type="button" disabled={busy===dispute._id} onClick={()=>update('disputes',dispute._id,{reviewStatus:'reviewing',adminNote:drafts[dispute._id]||'Review in progress.'})}>Mark under review</button><button className="btn btn-primary" disabled={busy===dispute._id}>{busy===dispute._id?'Saving…':'Record completed review'}</button></div></form></article>)}
   </section>}
   {section==='analytics'&&<section className="panel implementation-admin-card"><h2>Consented page views</h2><p className="muted">Opt-in first-party aggregate counts only. No visitor IDs, account IDs, IP addresses, query strings, or form contents are stored in these analytics records. Counts are page views, not unique people.</p><div className="implementation-metrics"><div><Icon name="chart" size={20}/><strong>{visits}</strong><span>{preview?'No sample tracking':'Consented page views'}</span></div><div><strong>{data.analytics.length}</strong><span>Daily page aggregates</span></div></div>{data.analytics.length>0&&<div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Aggregate analytics table"><table className="admin-table"><caption className="sr-only">Daily counts of consented page views</caption><thead><tr><th>Date</th><th>Page</th><th>Page views</th></tr></thead><tbody>{data.analytics.map(row=><tr key={row.day+row.page}><td>{row.day}</td><td>{row.page}</td><td>{row.count}</td></tr>)}</tbody></table></div>}</section>}
  </>}
 </div>;
}
