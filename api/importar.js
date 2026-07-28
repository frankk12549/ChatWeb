module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "text/html");
  res.status(200).send(`<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:800px;margin:20px;background:#111;color:#eee">
<h2>Importar dados</h2>
<ol>
<li><b>Site antigo:</b> aperte F12, va em Console e cole:<br>
<code style="background:#333;padding:2px 6px;border-radius:4px">copy(localStorage.getItem("atendimento_projeto_v1"))</code><br>
(Isso copia os dados pro clipboard)</li>
<li><b>Aqui mesmo:</b> cole no textarea abaixo (Ctrl+V) e clique "Salvar no site novo"</li>
</ol>
<textarea id="t" style="width:100%;height:300px;background:#222;color:#0f0;border:1px solid #444;font-family:monospace;font-size:12px"></textarea>
<br><br>
<button onclick="salvar()" style="background:#2563eb;color:#fff;border:none;padding:12px 30px;font-size:16px;border-radius:8px;cursor:pointer">Salvar no site novo</button>
<p id="msg"></p>
<script>
function salvar() {
  var val = document.getElementById("t").value.trim();
  if (!val) { document.getElementById("msg").textContent = "Cole o JSON primeiro."; return; }
  try { JSON.parse(val); } catch(e) { document.getElementById("msg").textContent = "JSON invalido: " + e.message; return; }
  localStorage.setItem("atendimento_projeto_v1", val);
  document.getElementById("msg").innerHTML = "Salvo! <a href='/'>Clique aqui</a> para recarregar o site.";
}
document.getElementById("t").focus();
</script>
</body></html>`);
};
