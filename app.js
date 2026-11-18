const WAIT_MS = 10 * 60 * 60 * 1000;
const $ = id => document.getElementById(id);
const KEY = "applock10h_state_v1";
let state = loadState();
let ticker = null;

function loadState(){
  try { return JSON.parse(localStorage.getItem(KEY)) || {appName:"",pinSalt:null,pinHash:null,request:null,history:[]}; }
  catch { return {appName:"",pinSalt:null,pinHash:null,request:null,history:[]}; }
}
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); render(); }
function log(message){
  state.history.unshift({at:new Date().toISOString(),message});
  state.history = state.history.slice(0,50);
}
function format(ms){
  ms = Math.max(0,ms);
  const h = Math.floor(ms/3600000), m = Math.floor(ms%3600000/60000), s = Math.floor(ms%60000/1000);
  return [h,m,s].map(x=>String(x).padStart(2,"0")).join(":");
}
function remaining(){ return state.request ? Math.max(0,state.request.endsAt-Date.now()) : WAIT_MS; }
function render(){
  $("appName").value = state.appName || "";
  $("appMessage").textContent = state.appName ? `Commitment set for: ${state.appName}` : "No app selected yet.";
  $("pinMessage").textContent = state.pinHash ? "Parent PIN is configured on this browser." : "No parent PIN configured.";
  const req = state.request;
  $("clock").textContent = req ? format(remaining()) : "10:00:00";
  $("timerState").textContent = !req ? "No request" : remaining() > 0 ? "Waiting" : "Ready for parent";
  $("timerMessage").textContent = !req ? "A 10-hour wait begins when you request removal." :
    remaining() > 0 ? `Removal request for ${req.appName}. Approval becomes available when the timer reaches zero.` :
    "The 10-hour wait is complete. A parent can now review the request.";
  $("progressBar").style.width = req ? `${Math.min(100,Math.max(0,(1-remaining()/WAIT_MS)*100))}%` : "0%";
  $("status").textContent = !req ? "Ready" : remaining() > 0 ? "Waiting" : "Approval due";
  $("requestBtn").disabled = !!req || !state.appName;
  $("cancelBtn").disabled = !req;
  $("parentBtn").disabled = !req;
  const list = $("history");
  list.replaceChildren();
  if(!state.history.length){ const li=document.createElement("li");li.className="muted";li.textContent="No activity yet.";list.append(li); }
  state.history.forEach(item=>{
    const li=document.createElement("li");
    li.textContent = `${new Date(item.at).toLocaleString()} — ${item.message}`;
    list.append(li);
  });
}
function bytesToHex(bytes){ return [...bytes].map(b=>b.toString(16).padStart(2,"0")).join(""); }
async function hashPin(pin,salt){
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256",data);
  return bytesToHex(new Uint8Array(digest));
}
function secureContextOK(){ return window.isSecureContext && crypto?.subtle; }

$("saveApp").addEventListener("click",()=>{
  const name=$("appName").value.trim();
  if(!name){ $("appMessage").textContent="Enter an app name first."; return; }
  if(state.request){ $("appMessage").textContent="Cancel or complete the current request before changing the app."; return; }
  state.appName=name; log(`Commitment set for ${name}.`); save();
});
$("requestBtn").addEventListener("click",()=>{
  if(!state.appName) return;
  if(!state.pinHash){ $("appMessage").textContent="Ask your parent to configure a PIN first."; return; }
  if(!confirm(`Start a 10-hour removal waiting period for "${state.appName}"?`)) return;
  const now=Date.now();
  state.request={appName:state.appName,requestedAt:now,endsAt:now+WAIT_MS};
  log(`10-hour removal request started for ${state.appName}.`);
  save();
});
$("cancelBtn").addEventListener("click",()=>{
  if(!state.request) return;
  if(!confirm("Cancel this removal request?")) return;
  log(`Removal request for ${state.request.appName} cancelled.`);
  state.request=null; save();
});
$("setPinBtn").addEventListener("click",async()=>{
  if(!secureContextOK()){ $("pinMessage").textContent="PIN setup requires HTTPS or localhost and a browser with Web Crypto."; return; }
  const pin=$("newPin").value, confirmPin=$("confirmPin").value;
  if(!/^\d{6,32}$/.test(pin)){ $("pinMessage").textContent="Use a PIN containing 6–32 digits."; return; }
  if(pin!==confirmPin){ $("pinMessage").textContent="The PINs do not match."; return; }
  if(state.pinHash && !confirm("Changing the existing PIN requires your parent to confirm they are authorized to change it.")) return;
  const salt=bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  state.pinSalt=salt; state.pinHash=await hashPin(pin,salt);
  $("newPin").value=""; $("confirmPin").value="";
  log(state.pinHash ? "Parent PIN configured or changed." : "Parent PIN configured.");
  save(); $("pinMessage").textContent="Parent PIN saved. Keep it private.";
});
$("parentBtn").addEventListener("click",()=>{
  if(!state.request) return;
  $("approvalPin").value="";
  $("approvalMessage").textContent = remaining()>0 ? `There are ${format(remaining())} remaining. Approval is locked until the wait ends.` : "The waiting period is complete. Parent may review.";
  $("approvalDialog").showModal();
});
$("approveBtn").addEventListener("click",async()=>{
  if(!state.request) return;
  if(remaining()>0){ $("approvalMessage").textContent=`Not yet. Wait ${format(remaining())} more.`; return; }
  const pin=$("approvalPin").value;
  if(!state.pinHash || !pin){ $("approvalMessage").textContent="Parent PIN required."; return; }
  const entered=await hashPin(pin,state.pinSalt);
  if(entered!==state.pinHash){ $("approvalMessage").textContent="Incorrect PIN."; return; }
  const name=state.request.appName;
  log(`Parent approved the removal request for ${name}. The app must still be uninstalled manually.`);
  state.request=null; save();
  $("approvalDialog").close();
  $("appMessage").textContent=`Parent approved the request for ${name}. Uninstall manually if you still choose to.`;
});
$("exportBtn").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify({appName:state.appName,request:state.request,history:state.history},null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url; a.download="applock10h-history.json"; a.click(); URL.revokeObjectURL(url);
});
function tick(){ if(state.request){ render(); } }
if("serviceWorker" in navigator && location.protocol!=="file:"){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
render();
ticker=setInterval(tick,1000);
