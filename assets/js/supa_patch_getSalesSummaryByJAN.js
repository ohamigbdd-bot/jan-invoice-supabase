/* === supa.js Add-on: getSalesSummaryByJAN (non-breaking) ===
 * Usage:
 *   1) Load after assets/js/supa.js on index.html
 *   2) Call: const rows = await supa.getSalesSummaryByJAN(jan);
 */
(function(){
  if (!window.supa || !window.supa.getSalesByJAN) {
    console.error("[supa_patch] supa.getSalesByJAN not found. Load supa.js first.");
    return;
  }
  async function getSalesSummaryByJAN(jan, teamKey){
    const rows = await window.supa.getSalesByJAN(jan, teamKey); // [{jan, sales_no, partner, amount}, ...]
    const map = new Map();
    for (const r of rows){
      const key = `${r.sales_no}||${r.partner||""}`;
      const prev = map.get(key) || { jan: jan, sales_no: r.sales_no, partner: r.partner || "", total_amount: 0 };
      prev.total_amount += Number(r.amount || 0);
      map.set(key, prev);
    }
    return Array.from(map.values()).sort((a,b)=> (a.sales_no||"").localeCompare(b.sales_no||""));
  }
  window.supa.getSalesSummaryByJAN = getSalesSummaryByJAN;
})();