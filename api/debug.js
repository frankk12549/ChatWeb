const { sql } = require("./_db");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    // Step 1: projetos
    let step = "projetos-select";
    let proj = await sql`SELECT id FROM projetos WHERE owner_id = '285d9053-dde1-442a-a6cd-187791714a55' LIMIT 1`;
    
    if (!proj.length) {
      step = "projetos-insert";
      proj = await sql`INSERT INTO projetos (owner_id) VALUES ('285d9053-dde1-442a-a6cd-187791714a55') RETURNING id`;
    }
    const projeto_id = proj[0].id;

    // Step 2: fluxos insert with sql.json
    step = "fluxos-insert";
    const config = body.config || {};
    const blocos = body.blocos || [];
    const fid = crypto.randomUUID();
    
    const rows = await sql`INSERT INTO fluxos (id, projeto_id, owner_id, nome, slug, config, blocos)
      VALUES (${fid}::uuid, ${projeto_id}, '285d9053-dde1-442a-a6cd-187791714a55', 'Debug', 'debug', ${sql.json(config)}, ${sql.json(blocos)})
      ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome
      RETURNING id, nome`;

    await sql`DELETE FROM fluxos WHERE id = ${fid}`;

    return res.status(200).json({ ok: true, step, projeto_id, row: rows[0] });
  } catch (e) {
    return res.status(500).json({ erro: e.message, step: arguments.callee?.name || "unknown" });
  }
};
