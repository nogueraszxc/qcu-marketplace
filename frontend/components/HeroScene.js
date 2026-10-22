import {useEffect,useRef} from 'react';
export default function HeroScene({children}){
 const sceneRef=useRef(null);
 useEffect(()=>{
  const scene=sceneRef.current,area=scene?.closest('.market-hero');if(!scene||!area)return;
  const preference=matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  let frame=0;
  const reset=()=>{cancelAnimationFrame(frame);frame=0;scene.style.setProperty('--scene-x','0px');scene.style.setProperty('--scene-y','0px');};
  const move=event=>{
   if(!preference.matches||event.pointerType!=='mouse')return;cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{const rect=area.getBoundingClientRect();scene.style.setProperty('--scene-x',(((event.clientX-rect.left)/rect.width-.5)*12).toFixed(2)+'px');scene.style.setProperty('--scene-y',(((event.clientY-rect.top)/rect.height-.5)*10).toFixed(2)+'px');frame=0;});
  };
  const change=()=>{if(!preference.matches)reset();};
  area.addEventListener('pointermove',move,{passive:true});area.addEventListener('pointerleave',reset,{passive:true});preference.addEventListener('change',change);
  return()=>{reset();area.removeEventListener('pointermove',move);area.removeEventListener('pointerleave',reset);preference.removeEventListener('change',change);};
 },[]);
 return <div className="hero-scene" ref={sceneRef}>{children}</div>;
}