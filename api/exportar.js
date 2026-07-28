module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "text/html");
  res.status(200).send(`<!DOCTYPE html><html><body>
<h2>Exportar dados do localStorage</h2>
<p>Apos carregar, aperte Ctrl+Shift+I (F12) va em Console e cole:</p>
<pre><code>copy(localStorage.getItem("atendimento_projeto_v1"))</code></pre>
<p>Depois cole no site novo.</p>
</body></html>`);
};
