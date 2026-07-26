const jwt = require("jsonwebtoken");
const { sql } = require("./_db");

const SECRET = process.env.JWT_SECRET || "fallback-secret";

function getUserId(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  try { return jwt.verify(auth.slice(7), SECRET).id; } catch { return null; }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ erro: "Nao autenticado." });

  try {
    if (req.method === "GET") {
      const rows = await sql`SELECT id, email, nome, dominio, config_jsonb FROM usuarios WHERE id = ${userId}`;
      if (!rows.length) return res.status(404).json({ erro: "Usuario nao encontrado." });
      return res.status(200).json(rows[0]);
    }

    if (req.method === "PUT") {
      const { nome, dominio, email, config_jsonb } = req.body || {};
      if (nome !== undefined) {
        await sql`UPDATE usuarios SET nome = ${nome} WHERE id = ${userId}`;
      }
      if (dominio !== undefined) {
        const limpo = dominio.replace(/^https?:\/\//i, "").replace(/\/+$/, "").replace(/\s/g, "");
        await sql`UPDATE usuarios SET dominio = ${limpo} WHERE id = ${userId}`;
      }
      if (email !== undefined) {
        const limpo = email.toLowerCase().trim();
        if (limpo.indexOf("@") === -1) return res.status(400).json({ erro: "Email invalido." });
        const existing = await sql`SELECT id FROM usuarios WHERE email = ${limpo} AND id != ${userId}`;
        if (existing.length) return res.status(409).json({ erro: "Esse email ja esta em uso." });
        await sql`UPDATE usuarios SET email = ${limpo} WHERE id = ${userId}`;
      }
      if (config_jsonb !== undefined) {
        await sql`UPDATE usuarios SET config_jsonb = ${JSON.stringify(config_jsonb)}::jsonb WHERE id = ${userId}`;
      }
      const rows = await sql`SELECT id, email, nome, dominio, config_jsonb FROM usuarios WHERE id = ${userId}`;
      return res.status(200).json(rows[0]);
    }

    return res.status(405).json({ erro: "Metodo nao permitido." });
  } catch (e) {
    console.error("perfil error:", e);
    return res.status(500).json({ erro: "Erro interno." });
  }
};
