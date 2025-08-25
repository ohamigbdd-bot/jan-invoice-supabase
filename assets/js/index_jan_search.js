/* === index.html Add-on: JAN Search UI wiring ===
 * Load after supa.js and supa_patch_getSalesSummaryByJAN.js
 */
(function(){
  const $ = (s)=>document.querySelector(s);
  function fmt(n){ try{ return Number(n||0).toLocaleString(); }catch(e){ return n; } }
  async function run(){
    const btn = $("#btnJanSearch");
    const input = $("#janSearchInput");
    const msg = $("#janSearchMsg");
    const tbody = $("#janSearchTable tbody");
    if(!btn || !input || !tbody){ return; }

    btn.addEventListener("click", async ()=>{
      const jan = (input.value||"").trim();
      if (!jan){ msg.textContent = "JANを入力してください"; return; }
      msg.textContent = "検索中…";
      try{
        if (!supa.getSalesSummaryByJAN) {
          throw new Error("supa.getSalesSummaryByJAN が見つかりません。パッチJSの読み込み順を確認してください。");
        }
        const rows = await supa.getSalesSummaryByJAN(jan);
        tbody.innerHTML = "";
        if (!rows.length){
          msg.textContent = "該当なし";
          return;
        }
        for (const r of rows){
          const tr = document.createElement("tr");
          tr.innerHTML = `<td>${r.jan||jan}</td><td>${r.sales_no||""}</td><td>${r.partner||""}</td><td style="text-align:right;">${fmt(r.total_amount)}</td>`;
          tbody.appendChild(tr);
        }
        msg.textContent = `${rows.length} 件`;
      }catch(e){
        console.error(e);
        msg.textContent = "検索に失敗しました: " + (e?.message||e);
      }
    });
  }
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", run);
  } else { run(); }
})();