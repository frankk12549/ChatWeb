const { sql } = require("./_db");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      const { sessao, fluxo_id, since, limit, owner_id } = req.query || {};
      const lim = Math.min(parseInt(limit) || 500, 1000);

      if (owner_id) {
        const rows = await sql`SELECT m.id, m.sessao_id, m.sessao_id AS sessao, m.fluxo_id, m.fluxo_id AS flow_id, m.remetente, m.texto, m.criado_em
          FROM mensagens m
          LEFT JOIN fluxos f ON m.fluxo_id = f.id
          WHERE f.owner_id = ${owner_id}
          ORDER BY m.criado_em DESC LIMIT ${lim}`;
        return res.status(200).json(Array.from(rows));
      }

      if (since) {
        const rows = await sql`SELECT id, sessao_id, sessao_id AS sessao, fluxo_id, fluxo_id AS flow_id, remetente, texto, criado_em
          FROM mensagens WHERE remetente = 'cliente'
          AND criado_em > ${new Date(parseInt(since)).toISOString()}::timestamp
          ORDER BY criado_em DESC LIMIT ${lim}`;
        return res.status(200).json(Array.from(rows));
      }

      if (sessao) {
        const rows = await sql`SELECT id, sessao_id, sessao_id AS sessao, fluxo_id, fluxo_id AS flow_id, remetente, texto, criado_em
          FROM mensagens WHERE sessao_id = ${sessao}
          ORDER BY criado_em ASC LIMIT ${lim}`;
        return res.status(200).json(Array.from(rows));
      }

      if (fluxo_id) {
        const rows = await sql`SELECT id, sessao_id, sessao_id AS sessao, fluxo_id, fluxo_id AS flow_id, remetente, texto, criado_em
          FROM mensagens WHERE fluxo_id = ${fluxo_id}
          ORDER BY criado_em DESC LIMIT ${lim}`;
        return res.status(200).json(Array.from(rows));
      }

      return res.status(400).json({ erro: "Parametro obrigatório: owner_id, sessao, fluxo_id ou since." });
    }

    if (req.method === "POST") {
      const { sessao_id, fluxo_id, remetente, texto } = req.body || {};
      if (!sessao_id || !remetente) return res.status(400).json({ erro: "sessao_id e remetente obrigatorios." });

      const id = "m_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const rows = await sql`INSERT INTO mensagens (id, sessao_id, fluxo_id, remetente, texto)
        VALUES (${id}, ${sessao_id}, ${fluxo_id || null}, ${remetente}, ${texto || ""})
        RETURNING id, sessao_id, sessao_id AS sessao, fluxo_id, fluxo_id AS flow_id, remetente, texto, criado_em`;
      return res.status(201).json(rows[0]);
    }

    return res.status(405).json({ erro: "Metodo nao permitido." });
  } catch (e) {
    console.error("mensagens error:", e);
    return res.status(500).json({ erro: "Erro interno.", detalhe: e.message });
  }
};
