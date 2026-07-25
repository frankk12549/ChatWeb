const { sql } = require("./db");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // GET — lista mensagens de uma sessão
    if (req.method === "GET") {
      const { sessao, fluxo_id, limit } = req.query || {};
      if (!sessao && !fluxo_id) return res.status(400).json({ erro: "sessao ou fluxo_id obrigatório." });

      const lim = Math.min(parseInt(limit) || 200, 500);
      let rows;
      if (sessao) {
        rows = await sql`SELECT id, sessao_id, fluxo_id, remetente, texto, criado_em FROM mensagens WHERE sessao_id = ${sessao} ORDER BY criado_em ASC LIMIT ${lim}`;
      } else {
        rows = await sql`SELECT id, sessao_id, fluxo_id, remetente, texto, criado_em FROM mensagens WHERE fluxo_id = ${fluxo_id} ORDER BY criado_em DESC LIMIT ${lim}`;
      }
      return res.status(200).json(rows);
    }

    // POST — envia mensagem
    if (req.method === "POST") {
      const { sessao_id, fluxo_id, remetente, texto } = req.body || {};
      if (!sessao_id || !remetente) return res.status(400).json({ erro: "sessao_id e remetente obrigatórios." });

      const rows = await sql`INSERT INTO mensagens (sessao_id, fluxo_id, remetente, texto)
        VALUES (${sessao_id}, ${fluxo_id || null}, ${remetente}, ${texto || ""})
        RETURNING id, sessao_id, fluxo_id, remetente, texto, criado_em`;
      return res.status(201).json(rows[0]);
    }

    return res.status(405).json({ erro: "Método não permitido." });
  } catch (e) {
    console.error("mensagens error:", e);
    return res.status(500).json({ erro: "Erro interno." });
  }
};
