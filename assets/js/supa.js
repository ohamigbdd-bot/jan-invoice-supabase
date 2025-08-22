// Supabase wrapper（ゲートは index.html 側でのみ実施）
const SUPABASE_URL = window.__SUPABASE_URL__ || "https://fmcmgkerzisiewcuexxr.supabase.co";
const SUPABASE_ANON_KEY = window.__SUPABASE_ANON_KEY__ || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtY21na2VyemlzaWV3Y3VleHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NzMzMDAsImV4cCI6MjA3MTI0OTMwMH0.Z-X9zoEZ0I80hRJzC-qQPK4Lnr9-3dt1SWN3NVZvkXA";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Data helpers
async function addPayments(records, teamKey) {
  const rows = records.map(r => ({ payment_no: r.paymentNo, jan: r.jan, team_key: teamKey }));
  const { error } = await sb.from('payments').insert(rows);
  if (error) throw error;
}
async function deleteByPaymentNo(paymentNo, teamKey) {
  const { error } = await sb.from('payments').delete().eq('payment_no', paymentNo).eq('team_key', teamKey);
  if (error) throw error;
}
async function getJANsByPaymentNo(paymentNo, teamKey) {
  const { data, error } = await sb.from('payments').select('jan').eq('payment_no', paymentNo).eq('team_key', teamKey);
  if (error) throw error;
  return (data || []).map(r => r.jan);
}
async function addSales(records, teamKey) {
  const rows = records.map(r => ({ jan: r.jan, sales_no: r.salesNo, partner: r.partner, amount: r.amount, team_key: teamKey }));
  const { error } = await sb.from('sales').insert(rows);
  if (error) throw error;
}
async function deleteSalesBySalesNo(salesNo, teamKey) {
  const { error } = await sb.from('sales').delete().eq('sales_no', salesNo).eq('team_key', teamKey);
  if (error) throw error;
}
async function getSalesByJAN(jan, teamKey) {
  const { data, error } = await sb.from('sales').select('jan,sales_no,partner,amount').eq('jan', jan).eq('team_key', teamKey);
  if (error) throw error;
  return data || [];
}

// Excel helpers
async function importPaymentXlsx(file, teamKey) {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (!rows.length) return 0;

  const headers = rows[0].map(h => String(h).trim().toLowerCase());
  const find = (alts) => {
    for (const a of alts) {
      const i = headers.indexOf(a);
      if (i >= 0) return i;
    }
    return -1;
  };

  const iPay  = find(["支払い番号","支払番号","payment_no","paymentno","payment"]);
  const iJan  = find(["janコード","janｺｰﾄﾞ","jan","jancode"]);
  if (iPay < 0 || iJan < 0) throw new Error("支払ファイルのヘッダが想定外です。必要: 支払い番号, JANコード");

  const recs = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const paymentNo = String(row[iPay]||"").trim();
    let janCell = String(row[iJan]||"").trim();
    if (!paymentNo || !janCell) continue;
    janCell.split(/\s*\n\s*/).forEach(j => { if (j) recs.push({ paymentNo, jan: j.trim() }); });
  }
  if (recs.length) await addPayments(recs, teamKey);
  return recs.length;
}

async function importSalesXlsx(file, teamKey) {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (!rows.length) return 0;

  const headers = rows[0].map(h => String(h).trim().toLowerCase());
  const find = (alts) => {
    for (const a of alts) {
      const i = headers.indexOf(a);
      if (i >= 0) return i;
    }
    return -1;
  };

  const iJan     = find(["janコード","janｺｰﾄﾞ","jan","jancode"]);
  const iSales   = find(["売上番号","salesno","sales_no","salesid","sales id"]);
  const iPartner = find(["取引先","client","partner","customer"]);
  const iAmount  = find(["金額","total","amount"]);
  if (iJan<0 || iSales<0 || iPartner<0 || iAmount<0) throw new Error("売上ファイルのヘッダが想定外です。必要: JAN/売上番号/取引先/金額");

  const recs = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const jan     = String(row[iJan]||"").trim();
    const salesNo = String(row[iSales]||"").trim();
    const partner = String(row[iPartner]||"").trim();
    const amount  = Number(String(row[iAmount]||"").replace(/[¥￥,]/g,"").trim() || 0);
    if (!jan) continue;
    recs.push({ jan, salesNo, partner, amount });
  }
  if (recs.length) await addSales(recs, teamKey);
  return recs.length;
}

async function exportPaymentsWorkbook(teamKey) {
  const { data, error } = await sb.from('payments').select('payment_no,jan').eq('team_key', teamKey);
  if (error) throw error;
  const aoa = [['支払い番号','JANコード']];
  (data||[]).forEach(r => aoa.push([r.payment_no, r.jan]));
  const ws = XLSX.utils.aoa_to_sheet(aoa), wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'payments');
  return wb;
}
async function exportSalesWorkbook(teamKey) {
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


// auth helpers
async function getUser(){
  try {
    const { data, error } = await sb.auth.getUser();
    if (error) return null;
    return data?.user || null;
  } catch(e){
    return null;
  }
}
// export

// === New: importSalesItemsXlsx (ユーザーのJANCODEテンプレ対応) ===
// Excel列: JANCODE / 商品名 / 商品數量 / 單價 / 總共價格
async function importSalesItemsXlsx(file, teamKey, salesNo, partner) {
  if (!salesNo) throw new Error("売上番号が空です");
  if (!partner) throw new Error("取引先が空です");

  const data = await file.arrayBuffer();
  const wb = XLSX.read(data);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (!rows.length) return 0;

  // ヘッダー探索（大小/全角半角は固定名想定のためここでは厳密一致）
  let headerRowIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const r = (rows[i]||[]).map(v => String(v||"").trim());
    const hset = new Set(r);
    if (hset.has("JANCODE") && hset.has("商品名") && hset.has("商品數量") && hset.has("單價") && hset.has("總共價格")) {
      headerRowIdx = i; break;
    }
  }
  if (headerRowIdx === -1) throw new Error("テンプレのヘッダー行が見つかりません");

  const headers = (rows[headerRowIdx]||[]).map(v => String(v||"").trim());
  const col = (name) => headers.indexOf(name);
  const cJAN = col("JANCODE"), cNM = col("商品名"), cQ = col("商品數量"), cP = col("單價"), cT = col("總共價格");
  if (cJAN<0 || cQ<0 || cP<0 || cT<0) throw new Error("テンプレ列の一部を検出できません");

  const recs = [];
  for (let r = headerRowIdx+1; r < rows.length; r++) {
    const row = rows[r] || [];
    const jan = String(row[cJAN]||"").trim();
    const qty = Number(String(row[cQ]||"").replace(/,/g,"").trim());
    const price = Number(String(row[cP]||"").replace(/,/g,"").trim());
    const total = String(row[cT]||"").toString().trim();
    if (!jan && !qty && !price && !total) continue; // 空行スキップ
    const amt = total ? Number(total.replace(/,/g,"")) : (isFinite(qty)&&isFinite(price) ? qty*price : 0);
    if (!jan) continue; // JAN必須（DB設計に合わせる）
    recs.push({ jan, salesNo, partner, amount: isFinite(amt) ? amt : 0 });
  }
  if (recs.length) await addSales(recs, teamKey);
  return recs.length;
}
window.supa = { sb, getUser,
  addPayments, deleteByPaymentNo, getJANsByPaymentNo,
  addSales, deleteSalesBySalesNo, getSalesByJAN,
  importPaymentXlsx, importSalesXlsx, importSalesItemsXlsx,
  exportPaymentsWorkbook, exportSalesWorkbook, downloadWorkbook
};
