const jwt = require("jsonwebtoken");
const { sql } = require("./_db");

const SECRET = process.env.JWT_SECRET || "fallback-secret";
const ADMIN_EMAIL = "leoconceicao18@gmail.com";

function verificarAdmin(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return false;
  try {
    const decoded = jwt.verify(auth.slice(7), SECRET);
    return decoded.email === ADMIN_EMAIL;
  } catch { return false; }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!verificarAdmin(req)) return res.status(403).json({ erro: "Acesso restrito ao admin." });

  try {
    if (req.method === "GET") {
      const rows = await sql`SELECT id, email, nome, aprovado, criado_em, ultimo_login FROM usuarios ORDER BY criado_em DESC`;
      return res.status(200).json({ usuarios: rows });
    }

    if (req.method === "POST") {
      const { usuario_id, acao } = req.body || {};
      if (!usuario_id || !acao) return res.status(400).json({ erro: "usuario_id e acao obrigatorios." });
      if (!["aprovar", "rejeitar"].includes(acao)) return res.status(400).json({ erro: "acao deve ser 'aprovar' ou 'rejeitar'." });

      if (acao === "rejeitar") {
        await sql`DELETE FROM usuarios WHERE id = ${usuario_id}`;
        return res.status(200).json({ ok: true, msg: "Usuario removido." });
      }

      await sql`UPDATE usuarios SET aprovado = true WHERE id = ${usuario_id}`;
      return res.status(200).json({ ok: true, msg: "Usuario aprovado." });
    }

    return res.status(405).json({ erro: "Metodo nao permitido." });
  } catch (e) {
    console.error("admin error:", e);
    return res.status(500).json({ erro: "Erro interno." });
  }
};
