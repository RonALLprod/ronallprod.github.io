/* RONALL PROD · FX PERFORMANCE BUILD
   Fondo estático y ligero. El bucle visual solo se activa durante la reproducción. */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function create(n, audio) {
    const state = { an:false, bass:0, mid:0, high:0, hit:0, energy:0, bins:new Float32Array(5) };
    const callbacks=[];
    let raf=0,last=0;
    const api={
      state,
      pointerTo:[0,0],
      onFrame(fn){ if(typeof fn==='function') callbacks.push(fn); },
      setImage(){},
      wake(){ if(!reduce && audio && !audio.paused && !document.hidden && !raf) raf=requestAnimationFrame(tick); }
    };
    function stop(){ if(raf) cancelAnimationFrame(raf); raf=0; last=0; }
    function tick(t){
      raf=0;
      if(document.hidden || !audio || audio.paused || audio.ended || reduce) return;
      if(t-last>=66){
        const dt=Math.min(.1,(t-last)/1000||.066); last=t;
        const k=t*.001;
        for(let i=0;i<5;i++){
          const g=.2+.7*Math.abs(Math.sin(k*(1.1+i*.53)+i*2.1)*Math.cos(k*.7*(i+1)));
          state.bins[i]+=(g-state.bins[i])*.22;
        }
        for(const fn of callbacks) fn(dt,state,k);
      }
      raf=requestAnimationFrame(tick);
    }
    if(audio){
      audio.addEventListener('play',api.wake,{passive:true});
      audio.addEventListener('pause',stop,{passive:true});
      audio.addEventListener('ended',stop,{passive:true});
    }
    document.addEventListener('visibilitychange',()=>document.hidden?stop():api.wake(),{passive:true});
    return api;
  }
  window.RonFX={create};
})();
