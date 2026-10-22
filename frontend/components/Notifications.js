import {useCallback,useEffect,useRef,useState} from 'react';
import api from '../lib/api';
import Icon from './Icon';
import {useAuth} from '../context/AuthContext';

export default function Notifications(){
 const {user,isPreview}=useAuth();
 const [open,setOpen]=useState(false),[items,setItems]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const root=useRef(null),button=useRef(null);
 const load=useCallback(async()=>{if(!user||isPreview)return;try{const {data}=await api.get('/users/notifications');setItems(data);setError('');}catch{setError('Notifications could not be loaded.');}},[user,isPreview]);
 useEffect(()=>{if(!user||isPreview)return;const timer=setInterval(load,30000);const first=setTimeout(load,0);return()=>{clearTimeout(first);clearInterval(timer);};},[user,isPreview,load]);
 useEffect(()=>{const close=event=>{if(event.key==='Escape'){setOpen(false);button.current?.focus();}else if(event.type==='pointerdown'&&!root.current?.contains(event.target))setOpen(false);};if(open){document.addEventListener('keydown',close);document.addEventListener('pointerdown',close);}return()=>{document.removeEventListener('keydown',close);document.removeEventListener('pointerdown',close);};},[open]);
 async function markRead(id){setBusy(true);try{await api.patch(id?`/users/notifications/${id}/read`:'/users/notifications/read-all',{});await load();}catch{setError('Read status could not be updated.');}finally{setBusy(false);}}
 if(!user)return null;
 const unread=items.filter(item=>!item.isRead).length;
 return <div className="notifications" ref={root}><button ref={button} className="icon-button" onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="notification-panel" aria-label={`Notifications${unread?', '+unread+' unread':''}`}><Icon name="bell" size={21}/>{unread>0&&<span className="notification-count" aria-hidden="true">{unread>99?'99+':unread}</span>}</button>{open&&<section className="notification-panel" id="notification-panel" aria-label="Notifications"><div className="notification-heading"><h2>Notifications</h2><button className="icon-button" aria-label="Close notifications" onClick={()=>{setOpen(false);button.current?.focus();}}><Icon name="x" size={18}/></button></div>{error&&<p className="inline-error" role="alert">{error}<button className="btn btn-secondary" onClick={load}>Retry</button></p>}{!items.length&&<p>{isPreview?'Design preview. No live notifications are loaded.':'You’re all caught up.'}</p>}{unread>0&&<button className="btn btn-secondary" disabled={busy} onClick={()=>markRead()}>Mark all read</button>}<ul>{items.map(item=><li key={item._id}><p>{item.message}</p><time>{new Date(item.createdAt).toLocaleString('en-PH',{timeZone:'Asia/Manila'})}</time>{!item.isRead&&<button className="btn btn-ghost" disabled={busy} onClick={()=>markRead(item._id)}>Mark read</button>}</li>)}</ul></section>}</div>;
}
