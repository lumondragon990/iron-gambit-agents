/**
 * Two pages served by the agent service:
 *   /       a public status page. No secrets, no data.
 *   /admin  a token-gated dashboard: trigger agents, read runs, approve outreach.
 */

import { CREST_SYMBOL, CREST_VIEWBOX } from './logo.js';

const NAV = (here) => `
<div class="topbar">
  <a class="brandmark" href="/">
    <svg viewBox="${CREST_VIEWBOX}"><use href="#crest"/></svg>
    <span>Iron Gambit</span>
  </a>
  <nav class="tabs">
    <a href="/"      class="${here === 'status' ? 'on' : ''}">Status</a>
    <a href="/admin" class="${here === 'admin'  ? 'on' : ''}">Admin</a>
    <a href="/city"  class="${here === 'city'   ? 'on' : ''}">The Yard</a>
  </nav>
</div>`;

const SHELL = (title, body, here) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Jost:wght@300;400;500&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<style>
:root{--ob:#0A0908;--ln:rgba(216,182,120,.16);--gold:#D8B678;--hi:#F0DAA8;--dp:#9C7C43;
--smoke:#8B8078;--cream:#F2EBDD;--ok:#6FBF73;--bad:#D98A7A;
--serif:'Cormorant Garamond',Georgia,serif;--sans:'Jost',system-ui,sans-serif;--mono:'JetBrains Mono',monospace}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--ob);color:var(--cream);font-family:var(--sans);font-weight:300;line-height:1.6;
padding:32px 20px 80px;-webkit-font-smoothing:antialiased}
.wrap{max-width:860px;margin:0 auto}
h1{font-family:var(--serif);font-weight:600;font-size:30px;letter-spacing:.14em;text-transform:uppercase}
.sub{font-family:var(--mono);font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:var(--dp);margin-top:4px}
.rule{height:1px;background:var(--ln);margin:26px 0}
h2{font-family:var(--sans);font-weight:400;font-size:9px;letter-spacing:.3em;text-transform:uppercase;
color:var(--dp);margin:32px 0 14px}
.card{border:1px solid var(--ln);padding:16px 18px;margin-bottom:8px}
.row{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.grow{flex:1;min-width:180px}
.name{font-size:15px}
.meta{font-family:var(--mono);font-size:10px;color:var(--smoke);letter-spacing:.06em;margin-top:3px}
button,.btn{font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;
border:1px solid var(--dp);color:var(--gold);background:none;padding:8px 14px;cursor:pointer;transition:all .2s}
button:hover,.btn:hover{background:var(--gold);color:var(--ob);border-color:var(--gold)}
button:disabled{opacity:.4;cursor:wait}
button.bad{border-color:#6B3A34;color:var(--bad)}
button.bad:hover{background:var(--bad);color:var(--ob);border-color:var(--bad)}
input{background:none;border:1px solid var(--ln);color:var(--cream);padding:12px 14px;font:inherit;
font-size:14px;width:100%;max-width:420px}
input:focus{outline:none;border-color:var(--gold)}
pre{font-family:var(--mono);font-size:11px;line-height:1.7;color:#A79E93;white-space:pre-wrap;
word-break:break-word;margin-top:10px;max-height:280px;overflow:auto}
pre::-webkit-scrollbar{width:4px}pre::-webkit-scrollbar-thumb{background:var(--dp)}
.pip{width:7px;height:7px;border-radius:50%;background:var(--ok);display:inline-block;margin-right:8px}
a{color:var(--gold)}
.note{font-size:12px;color:var(--smoke);margin-top:8px}
.err{color:var(--bad);font-size:12.5px;margin-top:10px;min-height:18px}
.dots{display:flex;gap:14px;justify-content:center;margin:22px 0 26px}
.dots i{width:14px;height:14px;border-radius:50%;border:1px solid var(--dp);display:block;transition:all .18s}
.dots i.on{background:var(--gold);border-color:var(--gold);box-shadow:0 0 12px rgba(216,182,120,.7)}
.pad{display:grid;grid-template-columns:repeat(3,86px);gap:12px;justify-content:center}
.pad button{font-family:var(--serif);font-size:27px;font-weight:500;letter-spacing:0;text-transform:none;
height:74px;border:1px solid var(--ln);color:var(--cream);background:none;transition:all .12s;padding:0}
.pad button:hover{border-color:var(--gold);color:var(--gold)}
.pad button:active{background:var(--gold);color:var(--ob)}
.pad button.alt{font-family:var(--mono);font-size:11px;letter-spacing:.12em;color:var(--smoke)}
#gate{text-align:center;max-width:340px;margin:0 auto}
#gate h2{text-align:center}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;
padding-bottom:18px;border-bottom:1px solid var(--ln);margin-bottom:26px}
.brandmark{display:flex;align-items:center;gap:11px;text-decoration:none}
.brandmark svg{width:40px;height:40px;color:var(--gold);flex:none}
.brandmark span{font-family:var(--serif);font-weight:600;font-size:19px;letter-spacing:.18em;
text-transform:uppercase;color:var(--cream)}
.tabs{display:flex;gap:8px}
.tabs a{font-family:var(--mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;
color:var(--smoke);border:1px solid var(--ln);padding:8px 13px;text-decoration:none;transition:all .2s}
.tabs a:hover{border-color:var(--dp);color:var(--gold)}
.tabs a.on{border-color:var(--gold);color:var(--gold)}
.hero{display:flex;align-items:center;gap:20px;margin-bottom:8px}
.hero svg{width:74px;height:74px;color:var(--gold);flex:none}
</style></head><body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true">${CREST_SYMBOL}</svg>
<div class="wrap">${NAV(here)}${body}</div></body></html>`;

export function statusPage(agents, tz) {
  const rows = agents.map(a => `
    <div class="card" style="border-left:2px solid ${a.color || '#D8B678'}"><div class="row">
      <div class="grow">
        <div class="name">${a.person || a.name} <span class="meta" style="display:inline">— ${a.name}</span></div>
        <div class="meta">${a.role || ''}</div>
        <div class="meta">${a.schedule ? a.schedule + '  ·  ' + tz : 'on demand'}${a.search ? '  ·  web search' : ''}</div>
      </div>
    </div></div>`).join('');
  return SHELL('Iron Gambit — Command', `
    <div class="hero"><svg viewBox="${CREST_VIEWBOX}"><use href="#crest"/></svg>
      <div><h1>Iron Gambit</h1><div class="sub">Command · Agent Service</div></div></div>
    <div class="rule"></div>
    <div class="card"><span class="pip"></span>Running. ${agents.length} agents loaded.</div>
    <div class="row" style="margin:16px 0 4px">
      <a class="btn" href="/city">Open the 3D yard</a>
      <a class="btn" href="/admin">Admin controls</a>
    </div>
    <h2>The crew</h2>${rows}
    <div class="rule"></div>
    <p class="note">This page is public and shows nothing sensitive.
    Health check: <a href="/health">/health</a></p>`, 'status');
}

export function adminPage() {
  return SHELL('Command — Admin', `
    <div class="hero"><svg viewBox="${CREST_VIEWBOX}"><use href="#crest"/></svg>
      <div><h1>Command</h1><div class="sub">Admin</div></div></div>
    <div class="rule"></div>
    <div class="row" style="margin-bottom:20px"><a class="btn" href="/city">Open the 3D yard</a>
    <button class="bad" onclick="localStorage.removeItem('igpin');localStorage.removeItem('igt');location.reload()">Lock</button></div>
    <div id="gate">
      <h2>Enter PIN</h2>
      <div class="dots" id="dots"></div>
      <div class="pad" id="pad"></div>
      <div class="err" id="gateErr"></div>
      <p class="note" id="gateNote">Remembered on this device. The 3D yard uses the same PIN.</p>
    </div>
    <div id="panel" style="display:none">
      <h2>Run an agent now</h2><div id="agents"></div>
      <h2>Outreach waiting for approval</h2><div id="outbox"></div>
      <h2>Recent runs</h2><div id="runs"></div>
    </div>
<script>
var T='', PINLEN=4, entry='', locked=false;
function h(){return {'x-admin-pin':T,'Content-Type':'application/json'};}
function esc(s){return String(s==null?'':s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}
function when(d){return new Date(d).toLocaleString();}

function drawDots(){
  var d=document.getElementById('dots'); d.innerHTML='';
  for(var i=0;i<PINLEN;i++){
    var s=document.createElement('i');
    if(i<entry.length) s.className='on';
    d.appendChild(s);
  }
}
function buildPad(){
  var p=document.getElementById('pad'); p.innerHTML='';
  ['1','2','3','4','5','6','7','8','9','clear','0','back'].forEach(function(k){
    var b=document.createElement('button');
    if(k==='clear'||k==='back'){ b.className='alt'; b.textContent=(k==='back'?'DEL':'CLR'); }
    else b.textContent=k;
    b.onclick=function(){
      if(locked) return;
      if(k==='clear') entry='';
      else if(k==='back') entry=entry.slice(0,-1);
      else if(entry.length<PINLEN) entry+=k;
      drawDots();
      if(entry.length===PINLEN) unlock();
    };
    p.appendChild(b);
  });
  drawDots();
}
document.addEventListener('keydown',function(e){
  if(document.getElementById('gate').style.display==='none'||locked) return;
  if(/^[0-9]$/.test(e.key)&&entry.length<PINLEN){ entry+=e.key; drawDots(); if(entry.length===PINLEN) unlock(); }
  if(e.key==='Backspace'){ entry=entry.slice(0,-1); drawDots(); }
});

async function boot(){
  try{
    var hres=await (await fetch('/health')).json();
    if(hres.pin_length) PINLEN=hres.pin_length;
    if(!hres.pin_length){
      document.getElementById('gateErr').innerHTML=
        'No PIN is set on the server.<br>Add an <b>ADMIN_PIN</b> variable in Railway, then reload.';
      document.getElementById('pad').style.display='none';
      return;
    }
  }catch(e){}
  buildPad();
  var saved=localStorage.getItem('igpin');
  if(saved){ T=saved; entry=saved; drawDots(); unlock(true); }
}

async function unlock(silent){
  T = silent ? T : entry;
  var e=document.getElementById('gateErr'); e.textContent='';
  try{
    var r=await fetch('/runs',{headers:h()});
    if(r.status===503){ e.textContent='No PIN set on the server. Add ADMIN_PIN in Railway.'; return; }
    if(r.status===429){
      var j=await r.json(); locked=true;
      var secs=j.retry_in_seconds||900;
      e.textContent='Too many wrong tries. Locked for '+Math.ceil(secs/60)+' minutes.';
      entry=''; drawDots(); return;
    }
    if(r.status===401){
      var j2=await r.json();
      e.textContent='Wrong PIN. '+(j2.tries_left!=null? j2.tries_left+' tries left before lockout.':'');
      entry=''; drawDots(); localStorage.removeItem('igpin'); return;
    }
    if(!r.ok) throw new Error('HTTP '+r.status);
    localStorage.setItem('igpin',T);
    document.getElementById('gate').style.display='none';
    document.getElementById('panel').style.display='block';
    loadAll();
  }catch(err){ e.textContent='Could not reach the service: '+err.message; entry=''; drawDots(); }
}

async function loadAll(){ await Promise.all([loadAgents(),loadOutbox(),loadRuns()]); }

async function loadAgents(){
  var a=await (await fetch('/agents')).json();
  document.getElementById('agents').innerHTML=a.map(function(x){
    return '<div class="card" style="border-left:2px solid '+esc(x.color||'#D8B678')+'"><div class="row"><div class="grow">'+
      '<div class="name">'+esc(x.person||x.name)+' <span class="meta" style="display:inline">— '+esc(x.name)+'</span></div>'+
      '<div class="meta">'+esc(x.role||'')+'</div>'+
      '<div class="meta">'+(x.schedule||'on demand')+(x.search?'  ·  web search':'')+'</div></div>'+
      '<button onclick="run(this,\\''+x.id+'\\')">Run</button></div>'+
      '<pre id="out_'+x.id+'" style="display:none"></pre></div>';
  }).join('');
}

async function run(btn,id){
  btn.disabled=true; var old=btn.textContent; btn.textContent='Working';
  var pre=document.getElementById('out_'+id); pre.style.display='block'; pre.textContent='Thinking. Search agents take 30 to 60 seconds.';
  try{
    var r=await fetch('/run/'+id,{method:'POST',headers:h(),body:JSON.stringify({data:''})});
    var j=await r.json();
    pre.textContent=j.summary||j.error||JSON.stringify(j,null,2);
    loadOutbox(); loadRuns();
  }catch(e){ pre.textContent='Failed: '+e.message; }
  btn.disabled=false; btn.textContent=old;
}

async function loadOutbox(){
  var o=await (await fetch('/outbox',{headers:h()})).json();
  var el=document.getElementById('outbox');
  if(!o.length){ el.innerHTML='<div class="card"><div class="meta">Nothing pending.</div></div>'; return; }
  el.innerHTML=o.map(function(x){
    var mail=x.to_email?esc(x.to_email):'no email — send this one as a DM by hand';
    return '<div class="card"><div class="row"><div class="grow">'+
      '<div class="name">'+esc(x.to_name||'Unknown')+' <span class="meta">'+esc(x.handle||'')+'</span></div>'+
      '<div class="meta">'+mail+'</div></div>'+
      (x.to_email?'<button onclick="approve(this,'+x.id+')">Send</button>':'')+
      '<button class="bad" onclick="reject(this,'+x.id+')">Reject</button></div>'+
      '<pre>'+esc(x.subject?('Subject: '+x.subject+'\\n\\n'):'')+esc(x.body)+'</pre></div>';
  }).join('');
}

async function approve(btn,id){
  btn.disabled=true; btn.textContent='Sending';
  var r=await fetch('/outbox/'+id+'/approve',{method:'POST',headers:h()});
  var j=await r.json();
  if(j.error){ btn.textContent='Failed'; alert(j.error); btn.disabled=false; }
  else loadOutbox();
}
async function reject(btn,id){
  btn.disabled=true;
  await fetch('/outbox/'+id+'/reject',{method:'POST',headers:h()});
  loadOutbox();
}

async function loadRuns(){
  var r=await (await fetch('/runs',{headers:h()})).json();
  document.getElementById('runs').innerHTML=r.slice(0,12).map(function(x){
    return '<div class="card"><div class="row"><div class="grow"><div class="name">'+esc(x.agent)+'</div>'+
      '<div class="meta">'+when(x.created_at)+'  ·  '+esc(x.trigger)+
      (x.tokens_out?('  ·  '+x.tokens_out+' out'):'')+'</div></div></div>'+
      '<pre>'+esc((x.output||'').slice(0,1400))+'</pre></div>';
  }).join('') || '<div class="card"><div class="meta">No runs yet.</div></div>';
}

boot();
</script>`, 'admin');
}
