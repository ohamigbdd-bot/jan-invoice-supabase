// Minimal Supabase wrapper + simple password gate (session based)
// 1) ここをあなたの Supabase 値に置き換えてください
const SUPABASE_URL = window.__SUPABASE_URL__ || "https://fmcmgkerzisiewcuexxr.supabase.co";
const SUPABASE_ANON_KEY = window.__SUPABASE_ANON_KEY__ || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtY21na2VyemlzaWV3Y3VleHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NzMzMDAsImV4cCI6MjA3MTI0OTMwMH0.Z-X9zoEZ0I80hRJzC-qQPK4Lnr9-3dt1SWN3NVZvkXA";

// 2) 簡易パスワードゲート：ハッシュ値を設定（平文ではなく SHA-256 文字列を入れる）
// 生成方法は: (async p=>{const b=new TextEncoder().encode(p);const d=await crypto.subtle.digest('SHA-256',b);console.log(Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,'0')).join(''));})('YOUR_PASSWORD');
const GATE_HASH = window.__GATE_HASH__ || "ami202508"; // 例: ab12...
const GATE_KEY  = "JAN_APP_GATE";

async function sha256Hex(text){ const buf=await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)); return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join(""); }
async function ensureGate(){
  if (sessionStorage.getItem(GATE_KEY) === "ok") return;
  while (true) {
    const pass = window.prompt("アクセスパスワードを入力してください：");
    if (pass === null) { document.body.innerHTML = "<p style='padding:24px;color:#e00'>アクセスがキャンセルされました。</p>"; throw new Error("gate-cancelled"); }
    if ((await sha256Hex(pass)) === GATE_HASH) { sessionStorage.setItem(GATE_KEY, "ok"); break; }
    alert("パスワードが違います。");
  }
}

// IIFE で先にゲートを通す（top-level await を避ける）
(async () => { try { await ensureGate(); } catch(e){ console.warn(e); } })();

// ===== Supabase client =====
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== Data helpers =====
async function addPayments(records, teamKey){
  const rows = records.map(r => ({ payment_no: r.paymentNo, jan: r.jan, team_key: teamKey }));
  const { error } = await sb.from('payments').insert(rows);
  if (error) throw error;
}
async function deleteByPaymentNo(paymentNo, teamKey){
  const { error } = await sb.from('payments').delete().eq('payment_no', paymentNo).eq('team_key', teamKey);
  if (error) throw error;
}
async function getJANsByPaymentNo(paymentNo, teamKey){
  const { data, error } = await sb.from('payments').select('jan').eq('payment_no', paymentNo).eq('team_key', teamKey);
  if (error) throw error;
  return (data||[]).map(r=>r.jan);
}
async function addSales(records, teamKey){
  const rows = records.map(r => ({ jan: r.jan, sales_no: r.salesNo, partner: r.partner, amount: r.amount, team_key: teamKey }));
  const { error } = await sb.from('sales').insert(rows);
  if (error) throw error;
}
async function deleteSalesBySalesNo(salesNo, teamKey){
  const { error } = await sb.from('sales').delete().eq('sales_no', salesNo).eq('team_key', teamKey);
  if (error) throw error;
}
async function getSalesByJAN(jan, teamKey){
  const { data, error } = await sb.from('sales').select('jan,sales_no,partner,amount').eq('jan', jan).eq('team_key', teamKey);
  if (error) throw error;
  return data || [];
}

// ===== Excel helpers (SheetJS) =====
async function importPaymentXlsx(file, teamKey){
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const recs = [];
  for (let i=1;i<json.length;i++){
    const row=json[i]; if(!row) continue;
    const paymentNo=String(row[0]||'').trim();
    const janRaw=String(row[1]||'').trim();
    if(!paymentNo||!janRaw) continue;
    janRaw.split(/\s*\n\s*/).forEach(j => { if(j) recs.push({paymentNo, jan:j}); });
  }
  if (recs.length) await addPayments(recs, teamKey);
  return recs.length;
}
async function importSalesXlsx(file, teamKey){
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const recs = [];
  for(let i=1;i<json.length;i++){
    const [jan,salesNo,partner,amount]=json[i]||[];
    const janS=String(jan||'').trim(); if(!janS) continue;
    recs.push({ jan:janS, salesNo:String(salesNo||'').trim(), partner:String(partner||'').trim(), amount:Number(amount||0) });
  }
  if (recs.length) await addSales(recs, teamKey);
  return recs.length;
}
async function exportPaymentsWorkbook(teamKey){
  const { data, error } = await sb.from('payments').select('payment_no,jan').eq('team_key', teamKey);
  if (error) throw error;
  const aoa = [['支払い番号','JANコード']];
  (data||[]).forEach(r => aoa.push([r.payment_no, r.jan]));
  const ws = XLSX.utils.aoa_to_sheet(aoa), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'payments');
  return wb;
}
async function exportSalesWorkbook(teamKey){
  const { data, error } = await sb.from('sales').select('jan,sales_no,partner,amount').eq('team_key', teamKey);
  if (error) throw error;
  const aoa = [['JANコード','売上番号','取引先','金額']];
  (data||[]).forEach(r => aoa.push([r.jan, r.sales_no, r.partner, r.amount]));
  const ws = XLSX.utils.aoa_to_sheet(aoa), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'sales');
  return wb;
}
function downloadWorkbook(wb, filename){
  const wbout = XLSX.write(wb, {bookType:'xlsx', type:'array'});
  const blob = new Blob([wbout], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); URL.revokeObjectURL(a.href);
}

// export to window
window.supa = {
  sb,
  addPayments, deleteByPaymentNo, getJANsByPaymentNo,
  addSales, deleteSalesBySalesNo, getSalesByJAN,
  importPaymentXlsx, importSalesXlsx,
  exportPaymentsWorkbook, exportSalesWorkbook, downloadWorkbook
};
