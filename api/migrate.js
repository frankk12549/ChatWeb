const { sql } = require("./_db");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ erro: "Use GET." });

  try {
    await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS aprovado BOOLEAN DEFAULT false`;
    await sql`UPDATE usuarios SET aprovado = true WHERE email = 'leoconceicao18@gmail.com'`;
    const rows = await sql`SELECT id, email, nome, aprovado FROM usuarios ORDER BY criado_em DESC`;
    return res.status(200).json({ ok: true, usuarios: rows });
  } catch (e) {
    console.error("migrate error:", e);
    return res.status(500).json({ erro: e.message });
  }
};
