const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sql } = require("./_db");

const SECRET = process.env.JWT_SECRET || "fallback-secret";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
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
      const rows = await sql`INSERT INTO usuarios (email, nome, senha_hash, aprovado) VALUES (${email.toLowerCase().trim()}, ${nome || email.split("@")[0]}, ${hash}, false) RETURNING id, email, nome`;
      const u = rows[0];
      const token = jwt.sign({ id: u.id, email: u.email, nome: u.nome }, SECRET, { expiresIn: "30d" });
      return res.status(201).json({ token, usuario: { id: u.id, email: u.email, nome: u.nome }, pendente: true });
    }

    return res.status(405).json({ erro: "Metodo nao permitido." });
  } catch (e) {
    console.error("auth error:", e);
    return res.status(500).json({ erro: "Erro interno." });
  }
};
