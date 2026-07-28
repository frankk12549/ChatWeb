module.exports = async function handler(req, res) {
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#111;color:#eee;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
<div style="background:#1a1a2e;padding:40px;border-radius:16px;max-width:500px;text-align:center">
<h2 style="margin-top:0">Importar funis</h2>
<p style="color:#999">Selecione o arquivo <b>funis.json</b> que baixou do site antigo.</p>
<input type="file" accept=".json" id="file" style="margin:20px 0;display:block;width:100%">
<button id="btn" style="background:#2563eb;color:#fff;border:none;padding:12px 30px;font-size:16px;border-radius:8px;cursor:pointer;width:100%">Importar</button>
<p id="msg" style="margin-top:16px;font-size:14px"></p>
</div>
<script>
document.getElementById("btn").onclick = function() {
  var f = document.getElementById("file").files[0];
  if (!f) { document.getElementById("msg").textContent = "Selecione o arquivo .json"; return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    var data = e.target.result;
    try { JSON.parse(data); } catch(e) { document.getElementById("msg").textContent = "Arquivo invalido: " + e.message; return; }
    localStorage.setItem("atendimento_projeto_v1", data);
    document.getElementById("msg").innerHTML = "Importado! <a href='/'" + ' style="color:#60a5fa">Clique aqui para ir ao site</a>';
  };
  reader.readAsText(f);
};
</script>
</body></html>`;
  res.setHeader("Content-Type", "text/html");
  res.status(200).send(html);
};
