// Simple password gate for index.html only
// Password = "ohamikeiri" (SHA-256 below). Trim & NFKC normalize to avoid全角/スペース差異
const GATE_HASH = "35575198419c62d34e5fbda6d6567c824ae33cf5bf05214945e6ed2c92dbdf8d"; // ohamikeiri

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function gateIndexOnly() {
  try {
    // このスクリプトは index.html にだけ読み込んでください
    if (!location.pathname.match(/\/(index\.html)?$/)) return; // index 以外は何もしない
    if (sessionStorage.getItem("JAN_APP_GATE") === "ok") return;
    while (true) {
      const input = window.prompt("アクセスパスワードを入力してください：");
      if (input === null) { location.href = "denied.html"; return; }
      const normalized = input.trim().normalize("NFKC"); // 前後スペース/全角の揺れ吸収
      const hex = await sha256Hex(normalized);
      if (hex === GATE_HASH) { sessionStorage.setItem("JAN_APP_GATE", "ok"); break; }
      alert("パスワードが違います。もう一度入力してください。");
    }
  } catch (e) {
    document.body.innerHTML = "<p style='padding:24px;color:#e00'>ゲート処理でエラーが発生しました。</p>";
  }
}
gateIndexOnly();
