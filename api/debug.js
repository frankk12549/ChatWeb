const { sql } = require("./_db");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const r = await sql`INSERT INTO fluxos (id, projeto_id, owner_id, nome, slug, config, blocos)
      VALUES (${crypto.randomUUID()}::uuid, 'test-proj', '285d9053-dde1-442a-a6cd-187791714a55', 'Teste', 'teste-debug', ${sql.json({foo:"bar"})}, ${sql.json([])})
      ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome
      RETURNING id, nome`;
    return res.status(200).json({ ok: true, row: r[0] });
  } catch (e) {
    return res.status(500).json({ erro: e.message, stack: e.stack });
  }
};
