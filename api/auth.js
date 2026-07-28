const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sql } = require("./_db");

const SECRET = process.env.JWT_SECRET || "fallback-secret";
const ADMIN_EMAIL = "leoconceicao18@gmail.com";

function verificarToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  try { return jwt.verify(auth.slice(7), SECRET); } catch (e) { return null; }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "POST") {
      const { email, senha } = req.body || {};
      if (!email || !senha) return res.status(400).json({ erro: "Email e senha obrigatorios." });

      const rows = await sql`SELECT id, email, nome, senha_hash, aprovado FROM usuarios WHERE email = ${email.toLowerCase().trim()}`;
      if (!rows.length) return res.status(401).json({ erro: "Email ou senha incorretos." });

      const u = rows[0];
      const ok = await bcrypt.compare(senha, u.senha_hash);
      if (!ok) return res.status(401).json({ erro: "Email ou senha incorretos." });

      if (u.aprovado === false) {
        return res.status(403).json({ erro: "Sua conta esta aguardando aprovacao do administrador.", pendente: true });
      }

      await sql`UPDATE usuarios SET ultimo_login = now() WHERE id = ${u.id}`;
      const token = jwt.sign({ id: u.id, email: u.email, nome: u.nome }, SECRET, { expiresIn: "30d" });
      return res.status(200).json({ token, usuario: { id: u.id, email: u.email, nome: u.nome } });
    }

    if (req.method === "PUT") {
      const { email, senha, nome } = req.body || {};
      if (!email || !senha) return res.status(400).json({ erro: "Email e senha obrigatorios." });
      if (senha.length < 6) return res.status(400).json({ erro: "Senha deve ter pelo menos 6 caracteres." });

      const existing = await sql`SELECT id FROM usuarios WHERE email = ${email.toLowerCase().trim()}`;
      if (existing.length) return res.status(409).json({ erro: "Esse email ja esta cadastrado." });

      const hash = await bcrypt.hash(senha, 10);
      const aprovado = email.toLowerCase().trim() === ADMIN_EMAIL;
      const rows = await sql`INSERT INTO usuarios (email, nome, senha_hash, aprovado) VALUES (${email.toLowerCase().trim()}, ${nome || email.split("@")[0]}, ${hash}, ${aprovado}) RETURNING id, email, nome`;
      const u = rows[0];
      const token = jwt.sign({ id: u.id, email: u.email, nome: u.nome }, SECRET, { expiresIn: "30d" });
      return res.status(201).json({ token, usuario: { id: u.id, email: u.email, nome: u.nome }, pendente: !aprovado });
    }

    // PATCH — alterar senha (autenticado)
    if (req.method === "PATCH") {
      const user = verificarToken(req);
      if (!user) return res.status(401).json({ erro: "Nao autenticado." });
      const { senha_atual, nova_senha } = req.body || {};
      if (!senha_atual || !nova_senha) return res.status(400).json({ erro: "Senha atual e nova senha obrigatorias." });
      if (nova_senha.length < 6) return res.status(400).json({ erro: "Nova senha deve ter pelo menos 6 caracteres." });

      const rows = await sql`SELECT id, senha_hash FROM usuarios WHERE id = ${user.id}`;
      if (!rows.length) return res.status(404).json({ erro: "Usuario nao encontrado." });

      const ok = await bcrypt.compare(senha_atual, rows[0].senha_hash);
      if (!ok) return res.status(401).json({ erro: "Senha atual incorreta." });

      const hash = await bcrypt.hash(nova_senha, 10);
      await sql`UPDATE usuarios SET senha_hash = ${hash} WHERE id = ${user.id}`;
      return res.status(200).json({ ok: true, mensagem: "Senha alterada com sucesso." });
    }

    return res.status(405).json({ erro: "Metodo nao permitido." });
  } catch (e) {
    console.error("auth error:", e);
    return res.status(500).json({ erro: "Erro interno." });
  }
};
