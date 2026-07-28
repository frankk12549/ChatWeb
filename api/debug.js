const { sql } = require("./_db");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const config = body.config || {};
    const blocos = body.blocos || [];

    const info = {
      typeofConfig: typeof config,
      typeofBlocos: typeof blocos,
      configStr: JSON.stringify(config).substring(0, 100),
      blocosStr: JSON.stringify(blocos).substring(0, 100),
      bodyKeys: Object.keys(body)
    };

    // Try raw sql.unsafe with explicit JSON string
    const r = await sql.unsafe(
      "INSERT INTO fluxos (id, projeto_id, owner_id, nome, slug, config, blocos) VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb, $7::jsonb) RETURNING id, nome",
      ["00000000-0000-4000-8000-000000000099", "test", "285d9053-dde1-442a-a6cd-187791714a55", "debug", "", JSON.stringify(config), JSON.stringify(blocos)]
    );

    await sql`DELETE FROM fluxos WHERE id = '00000000-0000-4000-8000-000000000099'`;

    return res.status(200).json({ ok: true, info, row: r[0] });
  } catch (e) {
    return res.status(500).json({ erro: e.message, detail: e.detail || "", hint: e.hint || "" });
  }
};
