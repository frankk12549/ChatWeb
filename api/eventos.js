const jwt = require("jsonwebtoken");
const { sql } = require("./_db");

const SECRET = process.env.JWT_SECRET || "fallback-secret";

function verificarToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  try { return jwt.verify(auth.slice(7), SECRET); } catch (e) { return null; }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "POST") {
      const { fluxo_id, sessao_id, tipo, dados } = req.body || {};
      if (!tipo) return res.status(400).json({ erro: "tipo obrigatório." });

      const id = "ev_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const rows = await sql`INSERT INTO eventos (id, fluxo_id, sessao_id, tipo, dados)
        VALUES (${id}, ${fluxo_id || null}, ${sessao_id || null}, ${tipo}, ${JSON.stringify(dados || {})})
        RETURNING id, fluxo_id, fluxo_id AS flow_id, sessao_id, sessao_id AS sessao, tipo, dados, criado_em`;
      return res.status(201).json(rows[0]);
    }

    if (req.method === "GET") {
      const user = verificarToken(req);
      if (!user) return res.status(401).json({ erro: "Não autorizado." });

      const { fluxo_id, periodo } = req.query || {};
      let rows;
      if (fluxo_id) {
        rows = await sql`SELECT id, fluxo_id, fluxo_id AS flow_id, sessao_id, sessao_id AS sessao, tipo, dados, criado_em FROM eventos WHERE fluxo_id = ${fluxo_id} ORDER BY criado_em DESC LIMIT 500`;
      } else {
        rows = await sql`SELECT id, fluxo_id, fluxo_id AS flow_id, sessao_id, sessao_id AS sessao, tipo, dados, criado_em FROM eventos WHERE fluxo_id IN (SELECT id FROM fluxos WHERE owner_id = ${user.id}) ORDER BY criado_em DESC LIMIT 500`;
      }
      return res.status(200).json(Array.from(rows));
    }

    return res.status(405).json({ erro: "Método não permitido." });
  } catch (e) {
    console.error("eventos error:", e);
    return res.status(500).json({ erro: "Erro interno." });
  }
};
