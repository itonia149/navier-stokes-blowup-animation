(() => {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const TAU = Math.PI * 2;

  // Valid paper exponent: 0 < h < 1/100.
  // The construction has l_r ~ tau^(1/2), l_z ~ tau^(1/2-h),
  // |u_theta|, |u_z| ~ tau^(-1/2-h), |u_r| = O(tau^-1/2).
  const h = 0.008;
  const D = 0.5 - h;
  const tau0 = 0.18;
  const tauEnd = 1e-14;

  const clamp = (x,a=0,b=1) => Math.max(a, Math.min(b, x));
  const mix = (a,b,t) => a + (b-a)*t;
  const smooth = t => t*t*(3-2*t);
  const smoother = t => t*t*t*(t*(t*6-15)+10);
  const phaseEase = p => smoother(clamp(p));
  const logTau = (p) => Math.log(tau0) + (Math.log(tauEnd)-Math.log(tau0)) * Math.pow(clamp(p), 1.42);
  const tauAt = p => Math.exp(logTau(p));

  function rng(seed){
    return () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const rnd = rng(9262026);

  // Particles are Lagrangian tracers of an exact divergence-free local affine field
  // matching the paper's central-core scaling:
  //   u_r = -a r/tau,
  //   u_z =  2a z/tau,
  //   u_theta = omega0 r tau^(-1-h).
  // This is a visualization surrogate for the central asymptotics, not the full
  // constructed profile and correction hierarchy.
  const aStrain = 0.27;
  const omega0 = 0.86;

  const N = 2400;
  const tracers = Array.from({length:N}, () => {
    // Fixed similarity-coordinate samples used to render the instantaneous field.
    const eta = (rnd()*2-1) * Math.pow(rnd(), 0.34);
    const rho = Math.sqrt(rnd()) * Math.sqrt(Math.max(0.04, 1-0.78*eta*eta));
    return {
      rho, eta, theta: TAU*rnd(),
      size: 0.35 + 1.15*Math.pow(rnd(),1.7),
      phase: TAU*rnd(), tint:rnd()
    };
  });

  const stars = Array.from({length:180}, () => ({
    x:rnd()*W, y:rnd()*H, r:0.25+0.8*rnd(), a:0.025+0.12*rnd()
  }));

  function coreScales(p){
    const tau = tauAt(p);
    const q = tau / tau0;
    const lr = 205 * Math.pow(q, 0.5);
    const lz = 165 * Math.pow(q, D);
    const speedTheta = Math.pow(q, -0.5-h);
    const speedR = Math.pow(q, -0.5);
    const energy = Math.pow(q, 0.5-3*h);
    return {tau,q,lr,lz,speedTheta,speedR,energy};
  }

  // Camera deliberately zooms toward the collapsing Eulerian core. Camera zoom is
  // not a physical scale; world geometry still follows the exact exponents above.
  function camera(p){
    const s = phaseEase(p);
    const sc = coreScales(p);
    const physicalShrink = Math.max(sc.lr/205, 1e-9);
    const follow = Math.pow(physicalShrink, -1.0);
    const dramatic = 0.84 + 2.45*smoother(clamp((p-.16)/.81));
    const scale = 1.05 * follow * dramatic;
    const az = -0.64 + 0.08*Math.sin(1.1*Math.PI*s) + 0.025*Math.sin(11*p);
    const el = 0.41 + 0.05*s;
    return {scale, az, el, cx:W*0.50, cy:H*0.505, focal:1180};
  }

  function project(x,y,z,cam){
    const ca=Math.cos(cam.az), sa=Math.sin(cam.az);
    const ce=Math.cos(cam.el), se=Math.sin(cam.el);
    const xr=ca*x-sa*y;
    const yr=sa*x+ca*y;
    const sy=ce*z-se*yr;
    const depth=ce*yr+se*z;
    const persp=1; // orthographic camera: zoom does not distort the self-similar geometry
    return {x:cam.cx+cam.scale*xr, y:cam.cy-cam.scale*sy, d:depth, persp};
  }

  function bg(p){
    const g=ctx.createRadialGradient(W*.50,H*.50,10,W*.50,H*.50,820);
    g.addColorStop(0,'#071115');
    g.addColorStop(.45,'#040a0d');
    g.addColorStop(1,'#010304');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

    ctx.save();
    for(let i=0;i<stars.length;i+=4){ const s=stars[i];
      ctx.fillStyle=`rgba(184,220,225,${s.a*.22*(1-.75*p)})`;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r*.55,0,TAU); ctx.fill();
    }
    ctx.restore();

    // very soft axial haze, purely cinematographic
    const haze=ctx.createLinearGradient(0,0,0,H);
    haze.addColorStop(0,'rgba(10,34,42,0)');
    haze.addColorStop(.5,`rgba(12,54,62,${0.04+0.06*p})`);
    haze.addColorStop(1,'rgba(10,34,42,0)');
    ctx.fillStyle=haze; ctx.fillRect(W*.36,0,W*.28,H);
  }

  function drawTracerField(p, cam){
    const sc = coreScales(p);
    const spin = (omega0/h) * (Math.pow(sc.tau,-h) - Math.pow(tau0,-h));
    const intensity = 0.58 + 0.42*smoother(clamp((p-.24)/.72));
    const lengthBoost = 0.75 + 1.85*smoother(clamp((p-.45)/.5));
    const draw=[];

    for(const tr of tracers){
      const th = tr.theta + spin*(0.80 + 0.38*(1-tr.rho)) + 0.10*Math.sin(tr.phase + p*9);
      const r = sc.lr * tr.rho;
      const z = sc.lz * tr.eta;
      const ct=Math.cos(th), st=Math.sin(th);
      const x=r*ct, y=r*st;

      // Exact divergence-free affine local field used for the visual surrogate.
      const ur = -aStrain*r/sc.tau;
      const uz =  2*aStrain*z/sc.tau;
      const uth = omega0*r*Math.pow(sc.tau,-1-h);
      const ux = ur*ct - uth*st;
      const uy = ur*st + uth*ct;

      // A visual exposure time proportional to tau keeps streaks finite while
      // retaining the increasing tangential dominance tau^{-h}.
      const dtVis = 0.050*sc.tau*lengthBoost;
      const x0=x-ux*dtVis*.40, y0=y-uy*dtVis*.40, z0=z-uz*dtVis*.40;
      const x1=x+ux*dtVis*.60, y1=y+uy*dtVis*.60, z1=z+uz*dtVis*.60;
      const a=project(x0,y0,z0,cam), b=project(x1,y1,z1,cam), c=project(x,y,z,cam);
      draw.push({tr,a,b,c,z,r});
    }
    draw.sort((A,B)=>A.c.d-B.c.d);

    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.lineCap='round';
    for(const item of draw){
      const {tr,a,b,c,z,r}=item;
      const axial=clamp(Math.abs(z)/(Math.max(sc.lz,1e-9)));
      const center=1-clamp(r/(Math.max(sc.lr,1e-9)));
      const hot=smooth(clamp((axial-.18)/.72));
      const R=Math.round(mix(40,255,hot));
      const G=Math.round(mix(210,146,hot));
      const B=Math.round(mix(202,67,hot));
      const alpha=(.075+.30*center+.095*(1-axial))*intensity;
      ctx.strokeStyle=`rgba(${R},${G},${B},${alpha})`;
      ctx.lineWidth=.62+tr.size*(.78+1.38*smoother(clamp((p-.50)/.45)));
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      if(center>.58){
        ctx.fillStyle=`rgba(${R},${G},${B},${alpha*.9})`;
        ctx.beginPath();ctx.arc(c.x,c.y,.55+tr.size*.62,0,TAU);ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawSpiralStreamlines(p,cam){
    const sc=coreScales(p);
    const spin=(omega0/h)*(Math.pow(sc.tau,-h)-Math.pow(tau0,-h));
    const k=(aStrain/omega0)*Math.pow(sc.tau,h);
    const fadeIn=smooth(clamp((p-.02)/.12));
    const glow=0.34+0.66*smoother(clamp((p-.45)/.5));
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
    for(let arm=0;arm<14;arm++){
      const off=TAU*arm/14 + spin*.17;
      const zlayer=((arm%3)-1)*sc.lz*.055;
      ctx.beginPath();
      let started=false;
      for(let j=0;j<=150;j++){
        const q=j/150;
        const ang=off + q*TAU*1.78;
        const r=sc.lr*1.16*Math.exp(-k*q*TAU*1.78);
        const z=zlayer + Math.sin(q*Math.PI)*sc.lz*.025*Math.sin(off*2);
        const pt=project(r*Math.cos(ang),r*Math.sin(ang),z,cam);
        if(!started){ctx.moveTo(pt.x,pt.y);started=true;}else ctx.lineTo(pt.x,pt.y);
      }
      ctx.strokeStyle=`rgba(55,224,213,${fadeIn*(.035+.040*glow)})`;
      ctx.lineWidth=.65+1.05*glow;ctx.stroke();
    }
    ctx.restore();
  }

  function drawAxialFilaments(p,cam){
    const sc=coreScales(p);
    const intensity=smooth(clamp((p-.08)/.78));
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
    for(let side of [-1,1]){
      for(let j=0;j<12;j++){
        const th=TAU*j/12 + p*5.3*side;
        ctx.beginPath();
        for(let k=0;k<=60;k++){
          const q=k/60;
          const z=side*sc.lz*(.04+1.38*q);
          const r=sc.lr*(.035+.10*q)*(.78+.22*Math.sin(j*1.3));
          const ang=th + side*.65*q;
          const pt=project(r*Math.cos(ang),r*Math.sin(ang),z,cam);
          if(k===0)ctx.moveTo(pt.x,pt.y);else ctx.lineTo(pt.x,pt.y);
        }
        ctx.strokeStyle=`rgba(255,155,67,${intensity*(.025+.026*(j%3===0))})`;
        ctx.lineWidth=.7+1.2*intensity;ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawCoreMist(p,cam){
    const sc=coreScales(p);
    const c=project(0,0,0,cam);
    const rr=Math.max(16, sc.lr*cam.scale*1.65);
    const bloom = smoother(clamp((p-.56)/.42));

    ctx.save();
    ctx.globalCompositeOperation='lighter';
    const g=ctx.createRadialGradient(c.x,c.y,0,c.x,c.y,rr*1.35);
    g.addColorStop(0,`rgba(210,255,252,${0.07+0.18*bloom})`);
    g.addColorStop(.18,`rgba(81,232,220,${0.05+0.13*bloom})`);
    g.addColorStop(1,'rgba(23,150,145,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(c.x,c.y,rr*1.35,0,TAU);ctx.fill();
    ctx.restore();
  }

  function drawAnnularPulses(p,cam){
    // Two families of complete-ring pulse envelopes in the surrounding annulus.
    // Their visible spatial scale becomes finer as the singular time approaches.
    const gate=smooth(clamp((p-.26)/.12))*(1-smooth(clamp((p-.965)/.03)));
    if(gate<=0.001) return;
    const sc=coreScales(p);
    const fineness=8 + Math.floor(46*smoother(clamp((p-.35)/.6)));
    const basePhase=62*p*p;

    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.lineCap='round';
    for(let fam=0;fam<2;fam++){
      const col = fam===0 ? [166,119,255] : [255,83,141];
      const zsign = fam===0 ? 1 : -1;
      for(let j=0;j<3;j++){
        const radius=sc.lr*(1.20 + .19*j + .035*fam);
        const z=sc.lz*(zsign*(.18+.18*j) + (fam?-.03:.03));
        const segments=Math.max(90, fineness*5);
        for(let k=0;k<segments;k++){
          const ph=TAU*k/segments;
          const osc=.5+.5*Math.sin(fineness*ph + basePhase*(fam?1:-1) + j*1.8);
          const env=Math.pow(osc,5.5);
          if(env<.22) continue;
          const ph2=ph+TAU/segments*1.5;
          const p0=project(radius*Math.cos(ph),radius*Math.sin(ph),z,cam);
          const p1=project(radius*Math.cos(ph2),radius*Math.sin(ph2),z,cam);
          ctx.strokeStyle=`rgba(${col[0]},${col[1]},${col[2]},${gate*(.07+.25*env)})`;
          ctx.lineWidth=.9+2.15*env;
          ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  function drawEnvelope(p,cam){
    const sc=coreScales(p);
    const alpha=.045*(1-smooth(clamp((p-.86)/.12)));
    if(alpha<.001)return;
    ctx.save();
    ctx.strokeStyle=`rgba(84,224,214,${alpha})`;
    ctx.lineWidth=1;
    for(const zf of [-.75,-.36,0,.36,.75]){
      ctx.beginPath();
      for(let k=0;k<=160;k++){
        const th=TAU*k/160;
        const r=sc.lr*Math.sqrt(Math.max(0,1-zf*zf));
        const q=project(r*Math.cos(th),r*Math.sin(th),sc.lz*zf,cam);
        if(k===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawAxisOutflow(p,cam){
    const sc=coreScales(p);
    const intensity=smooth(clamp((p-.16)/.75));
    const n=22;
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let side of [-1,1]){
      for(let i=0;i<n;i++){
        const frac=(i+.4)/n;
        const z0=side*sc.lz*(.05 + 1.75*frac);
        const r=sc.lr*(.035+.08*Math.sin(i*2.7+p*19));
        const th=i*.87 + p*12*side;
        const a=project(r*Math.cos(th),r*Math.sin(th),z0,cam);
        const b=project(r*.55*Math.cos(th+.13),r*.55*Math.sin(th+.13),z0+side*sc.lz*.20,cam);
        const aa=(.03+.16*(1-frac))*intensity;
        ctx.strokeStyle=`rgba(255,150,69,${aa})`;
        ctx.lineWidth=.7+1.8*(1-frac);
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      }
    }
    ctx.restore();
  }

  function endpointBloom(p){
    // Optical/cinematic bloom only: no outward material or shock wave is drawn.
    const q=smoother(clamp((p-.90)/.10));
    if(q<=0)return;
    const c={x:W*.5,y:H*.505};
    ctx.save();ctx.globalCompositeOperation='lighter';
    const r=mix(9, 250, Math.pow(q,2.5));
    const g=ctx.createRadialGradient(c.x,c.y,0,c.x,c.y,r);
    g.addColorStop(0,`rgba(255,255,255,${.4+.6*q})`);
    g.addColorStop(.08,`rgba(218,255,251,${.28+.55*q})`);
    g.addColorStop(.30,`rgba(87,228,219,${.08+.18*q})`);
    g.addColorStop(1,'rgba(87,228,219,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(c.x,c.y,r,0,TAU);ctx.fill();
    ctx.restore();

    // At the terminal instant, visibility is lost in a whiteout rather than a fake explosion.
    const white=smoother(clamp((p-.972)/.022));
    if(white>0){ctx.fillStyle=`rgba(238,255,253,${white*.95})`;ctx.fillRect(0,0,W,H);}
    const black=smoother(clamp((p-.994)/.006));
    if(black>0){ctx.fillStyle=`rgba(0,0,0,${black})`;ctx.fillRect(0,0,W,H);}
  }

  function render(p){
    p=clamp(p);
    bg(p);
    const cam=camera(p);
    drawCoreMist(p,cam);
    drawEnvelope(p,cam);
    drawSpiralStreamlines(p,cam);
    drawAnnularPulses(p,cam);
    drawTracerField(p,cam);
    drawAxialFilaments(p,cam);
    drawAxisOutflow(p,cam);
    endpointBloom(p);

    // subtle vignette, increasing as we zoom into the core
    const vg=ctx.createRadialGradient(W*.5,H*.505,220,W*.5,H*.505,780);
    vg.addColorStop(.42,'rgba(0,0,0,0)');
    vg.addColorStop(1,`rgba(0,0,0,${.54+.24*p})`);
    ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
  }

  window.renderAt = render;
  window.__externalRender = false;

  // Interactive playback for the HTML player. The render script calls renderAt directly.
  let running=true, start=performance.now(), hold=0;
  const duration=24;
  function loop(now){
    if(running && !window.__externalRender){
      const t=((now-start)/1000)%duration;
      hold=t/duration;
      render(hold);
    }
    requestAnimationFrame(loop);
  }
  window.restartPlayback = () => { hold=0; start=performance.now(); running=true; window.__externalRender=false; render(0); };
  canvas.addEventListener('click',()=>{
    running=!running;
    if(running) start=performance.now()-hold*duration*1000;
  });
  render(0);
  requestAnimationFrame(loop);
})();
