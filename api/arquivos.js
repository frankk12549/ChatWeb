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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const user = verificarToken(req);

    // GET — buscar arquivos de um fluxo
    if (req.method === "GET") {
      const { fluxo_id } = req.query || {};
      if (!fluxo_id) return res.status(400).json({ erro: "fluxo_id obrigatório." });

      const rows = await sql`SELECT id, chave, dados FROM arquivos WHERE fluxo_id = ${fluxo_id}`;
      return res.status(200).json(Array.from(rows));
    }

    // POST — salvar arquivos (batch) de um fluxo
    if (req.method === "POST") {
      if (!user) return res.status(401).json({ erro: "Não autorizado." });
      const { fluxo_id, arquivos } = req.body || {};
      if (!fluxo_id || !Array.isArray(arquivos)) return res.status(400).json({ erro: "fluxo_id e arquivos[] obrigatórios." });

      // Remove arquivos antigos deste fluxo e insere os novos
      await sql`DELETE FROM arquivos WHERE fluxo_id = ${fluxo_id}`;
      for (const a of arquivos) {
        if (a.chave && a.dados) {
          await sql`INSERT INTO arquivos (id, owner_id, fluxo_id, chave, dados) VALUES (${a.id || ("arq-" + Date.now().toString(36) + Math.random().toString(36).slice(2,6))}, ${user.id}, ${fluxo_id}, ${a.chave}, ${a.dados})`;
        }
      }
      return res.status(200).json({ ok: true, count: arquivos.length });
    }

    // DELETE — remover arquivos de um fluxo
    if (req.method === "DELETE") {
      if (!user) return res.status(401).json({ erro: "Não autorizado." });
      const { fluxo_id } = req.query || {};
      if (!fluxo_id) return res.status(400).json({ erro: "fluxo_id obrigatório." });
      await sql`DELETE FROM arquivos WHERE fluxo_id = ${fluxo_id} AND owner_id = ${user.id}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ erro: "Método não permitido." });
  } catch (e) {
    console.error("arquivos error:", e);
    return res.status(500).json({ erro: "Erro interno." });
  }
};
