
(() => {
  'use strict';
  const rnd = (a, b) => a + Math.random() * (b - a);
  
  function create(n, audio) {
    const state = { an:false, bass:0, mid:0, high:0, hit:0, energy:0, bins:new Float32Array(5) };
    const cbs = [], cam = n.camera, cx = cam && cam.getContext('2d');
    let seq=0, raf=0, last=0, activeUntil=0, timer=0;
    const api = { state, pointerTo:[0,0], wake, onFrame(f){cbs.push(f);}, setImage };

    const tiny=document.createElement('canvas'); tiny.width=96; tiny.height=54;
    const tx=tiny.getContext('2d',{willReadFrequently:true});
    function setImage(img){
      if(!cx||!img)return;
      const my=++seq; cam.classList.remove('on');
      setTimeout(()=>{
        if(my!==seq)return;
        try{
          const W=96,H=54,iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
          const s=Math.max(W/iw,H/ih),w=iw*s,h=ih*s;
          tx.drawImage(img,(W-w)/2,(H-h)*.4,w,h);
          const d=tx.getImageData(0,0,W,H),p=d.data;
          for(let i=0;i<p.length;i+=4){
            const y=(p[i]*.3+p[i+1]*.59+p[i+2]*.11)*.76;
            p[i]=p[i+1]=p[i+2]=y;
          }
          tx.putImageData(d,0,0);
          cam.width=480;cam.height=270;cx.imageSmoothingQuality='medium';cx.drawImage(tiny,0,0,480,270);
          cam.classList.add('on');
        }catch(e){}
      },180);
    }

    const field=document.createElement('div');field.className='fx-ambient';field.setAttribute('aria-hidden','true');
    const blobs=[0,1,2].map(()=>field.appendChild(document.createElement('i')));
    n.root&&n.root.appendChild(field);
    const drift=()=>{
      if(cam)cam.style.transform=`translate3d(${rnd(-2,2).toFixed(2)}%,${rnd(-1.7,1.7).toFixed(2)}%,0) scale(${rnd(1.02,1.06).toFixed(3)})`;
      blobs.forEach(b=>{
        b.style.transitionDuration=rnd(18,28).toFixed(1)+'s';
        b.style.transform=`translate3d(${rnd(-10,10).toFixed(1)}vw,${rnd(-9,9).toFixed(1)}vh,0) scale(${rnd(.94,1.12).toFixed(2)})`;
        b.style.opacity=rnd(.5,.82).toFixed(2);
      });
    };
    const go=()=>{if(timer||document.hidden)return;drift();timer=setInterval(drift,24000);};
    const stop=()=>{clearInterval(timer);timer=0;};
    function wake(){
      if(document.hidden)return;
      activeUntil=performance.now()+500;
      if(!raf){last=0;raf=requestAnimationFrame(tick);}
    }
    function tick(t){
      if(document.hidden){raf=0;return;}
      const playing=!!(audio&&!audio.paused&&!audio.ended);
      if(!playing&&t>activeUntil){raf=0;return;}
      raf=requestAnimationFrame(tick);
      if(t-last<1000/30)return;
      const dt=Math.min(.1,(t-last)/1000||.05);last=t;const k=t*.001;
      for(let i=0;i<5;i++){
        const g=playing ? (.2+.7*Math.abs(Math.sin(k*(1.1+i*.53)+i*2.1)*Math.cos(k*.7*(i+1)))):0;
        state.bins[i]+=(g-state.bins[i])*.2;
      }
      for(const f of cbs)f(dt,state,k);
    }
    if(audio){
      audio.addEventListener('play',wake);
      audio.addEventListener('pause',()=>{activeUntil=performance.now()+120;});
      audio.addEventListener('ended',()=>{activeUntil=performance.now()+120;});
    }
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden)stop();
      else{go();if(audio&&!audio.paused)wake();}
    });
    go();
    return api;
  }
  window.RonFX={create};
})();