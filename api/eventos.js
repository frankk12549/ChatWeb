const jwt = require("jsonwebtoken");
const { sql } = require("./db");

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
    // POST — registra evento (público — lead gera eventos)
    if (req.method === "POST") {
      const { fluxo_id, sessao_id, tipo, dados } = req.body || {};
      if (!tipo) return res.status(400).json({ erro: "tipo obrigatório." });

      const rows = await sql`INSERT INTO eventos (fluxo_id, sessao_id, tipo, dados)
        VALUES (${fluxo_id || null}, ${sessao_id || null}, ${tipo}, ${JSON.stringify(dados || {})})
        RETURNING id, fluxo_id, sessao_id, tipo, dados, criado_em`;
      return res.status(201).json(rows[0]);
    }

    // GET — busca eventos (autenticado, pra métricas)
    if (req.method === "GET") {
      const user = verificarToken(req);
      if (!user) return res.status(401).json({ erro: "Não autorizado." });

      const { fluxo_id, periodo } = req.query || {};
      let rows;
      if (fluxo_id) {
        rows = await sql`SELECT id, fluxo_id, sessao_id, tipo, dados, criado_em FROM eventos WHERE fluxo_id = ${fluxo_id} ORDER BY criado_em DESC LIMIT 500`;
      } else {
        rows = await sql`SELECT e.id, e.fluxo_id, e.sessao_id, e.tipo, e.dados, e.criado_em FROM eventos e JOIN fluxos f ON e.fluxo_id = f.id WHERE f.owner_id = ${user.id} ORDER BY e.criado_em DESC LIMIT 500`;
      }
      return res.status(200).json(rows);
    }

    return res.status(405).json({ erro: "Método não permitido." });
  } catch (e) {
    console.error("eventos error:", e);
    return res.status(500).json({ erro: "Erro interno." });
  }
};
