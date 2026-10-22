import {useEffect,useRef} from 'react';
import {useRouter} from 'next/router';
const revealSelector='.product-card,.panel,.seller-callout,.ws-seller-note,.ws-campus-reminder,.admin-care-panel';
const ease='cubic-bezier(.2,.75,.25,1)';
export default function MotionPage({children}){
 const rootRef=useRef(null),router=useRouter();
 useEffect(()=>{
  const root=rootRef.current;if(!root)return;
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const active=new Set(),seen=new WeakSet();
  let observer,frame=0,pendingTimer,positions=new Map();
  const play=(element,keyframes,options)=>{
   if(preference.matches||typeof element.animate!=='function'||element.contains(document.activeElement))return;
   const animation=element.animate(keyframes,{easing:ease,fill:'none',...options});
   active.add(animation);animation.onfinish=()=>active.delete(animation);animation.oncancel=()=>active.delete(animation);
  };
  const stop=()=>{active.forEach(animation=>animation.cancel());active.clear();};
  const attach=()=>{
   observer?.disconnect();
   if(preference.matches){stop();return;}
   play(root,[{translate:'0 10px'},{translate:'0 0'}],{duration:360});
   if(!('IntersectionObserver' in window))return;
   observer=new IntersectionObserver(entries=>{
    let index=0;
    entries.forEach(entry=>{
     if(!entry.isIntersecting)return;observer.unobserve(entry.target);
     const card=entry.target.matches('.product-card');
     play(entry.target,[{translate:'0 20px',scale:card?'.98':'1'},{translate:'0 0',scale:'1'}],{duration:420,delay:card?Math.min(index++*40,160):0});
    });
   },{threshold:.08,rootMargin:'0px 0px -16px 0px'});
   scan(true);
  };
  const scan=(initial=false)=>{
   if(preference.matches||!observer)return;
   root.querySelectorAll(revealSelector).forEach(element=>{
    if(seen.has(element))return;seen.add(element);
    if(element.parentElement?.closest('.panel')&&!element.matches('.product-card'))return;
    const rect=element.getBoundingClientRect();
    if(initial&&rect.top<innerHeight&&!element.matches('.product-card'))return;
    observer.observe(element);
   });
  };
  const remember=()=>{stop();if(preference.matches)return;positions=new Map(Array.from(root.querySelectorAll('.product-card')).slice(0,40).map(element=>[element,element.getBoundingClientRect()]));};
  const update=()=>{
   if(frame)return;
   frame=requestAnimationFrame(()=>{
    frame=0;
    if(!preference.matches&&positions.size){
     const moves=[];
     positions.forEach((before,element)=>{if(!element.isConnected)return;const after=element.getBoundingClientRect();const x=before.left-after.left,y=before.top-after.top;if(Math.abs(x)>1||Math.abs(y)>1)moves.push({element,x,y});});
     moves.forEach(({element,x,y})=>play(element,[{translate:x+'px '+y+'px'},{translate:'0 0'}],{duration:300}));
     positions.clear();
    }
    scan();
   });
  };
  const keepFocusVisible=event=>{
   const target=event.target;
   if(!(target instanceof HTMLElement)||target.closest('[role="dialog"]'))return;
   const rect=target.getBoundingClientRect();
   const header=document.querySelector('.site-header')?.getBoundingClientRect();
   const nav=document.querySelector('.mobile-bottom-nav');
   const navRect=nav&&getComputedStyle(nav).display!=='none'?nav.getBoundingClientRect():null;
   const top=header?header.bottom+12:12,bottom=navRect?navRect.top-12:innerHeight-12;
   if(rect.height>bottom-top)return;
   if(rect.bottom>bottom)window.scrollBy({top:rect.bottom-bottom,behavior:'instant'});
   else if(rect.top<top)window.scrollBy({top:rect.top-top,behavior:'instant'});
  };

  const mutation=new MutationObserver(update);mutation.observe(root,{childList:true,subtree:true});
  const start=()=>{clearTimeout(pendingTimer);pendingTimer=setTimeout(()=>{document.documentElement.dataset.routePending='true';},140);};
  const finish=()=>{clearTimeout(pendingTimer);delete document.documentElement.dataset.routePending;};
  const preferenceChanged=()=>{stop();if(preference.matches)observer?.disconnect();else attach();};
  attach();
  root.addEventListener('pointerdown',remember,{capture:true,passive:true});
  root.addEventListener('focusin',keepFocusVisible);
  root.addEventListener('change',remember,true);root.addEventListener('keydown',stop,true);
  preference.addEventListener('change',preferenceChanged);
  router.events.on('routeChangeStart',start);router.events.on('routeChangeComplete',finish);router.events.on('routeChangeError',finish);
  return()=>{stop();observer?.disconnect();mutation.disconnect();cancelAnimationFrame(frame);finish();root.removeEventListener('pointerdown',remember,true);root.removeEventListener('focusin',keepFocusVisible);root.removeEventListener('change',remember,true);root.removeEventListener('keydown',stop,true);preference.removeEventListener('change',preferenceChanged);router.events.off('routeChangeStart',start);router.events.off('routeChangeComplete',finish);router.events.off('routeChangeError',finish);};
 },[router.events]);
 return <div ref={rootRef} className="motion-page">{children}</div>;
}
