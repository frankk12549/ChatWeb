const jwt = require("jsonwebtoken");
const { sql } = require("./_db");

const SECRET = process.env.JWT_SECRET || "fallback-secret";

function verificarToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  try { return jwt.verify(auth.slice(7), SECRET); } catch (e) { return null; }
}

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return {};
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const user = verificarToken(req);

    if (req.method === "GET") {
      const { slug, owner_id, id } = req.query || {};

      if (slug) {
        const rows = await sql`SELECT id, nome, slug, config, blocos, publicado, owner_id FROM fluxos WHERE slug = ${slug} ORDER BY atualizado_em DESC NULLS LAST LIMIT 1`;
        if (!rows.length) return res.status(404).json({ erro: "Funil nao encontrado." });
        return res.status(200).json(rows[0]);
      }

      if (!user) return res.status(401).json({ erro: "Nao autorizado." });
      const oid = owner_id || user.id;
      const rows = await sql`SELECT id, nome, slug, config, blocos, publicado, criado_em, atualizado_em FROM fluxos WHERE owner_id = ${oid} ORDER BY atualizado_em DESC`;
      return res.status(200).json(Array.from(rows));
    }

    if (req.method === "POST") {
      if (!user) return res.status(401).json({ erro: "Nao autorizado." });
      const body = parseBody(req);
      const { id, nome, slug } = body;
      const config = typeof body.config === "string" ? JSON.parse(body.config) : (body.config || {});
      const blocos = typeof body.blocos === "string" ? JSON.parse(body.blocos) : (body.blocos || []);

      let proj = await sql`SELECT id FROM projetos WHERE owner_id = ${user.id} LIMIT 1`;
      if (!proj.length) {
        proj = await sql`INSERT INTO projetos (owner_id) VALUES (${user.id}) RETURNING id`;
      }
      const projeto_id = proj[0].id;

      function uuidV4() { return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(c){var r=Math.random()*16|0;return(c==="x"?r:(r&0x3|0x8)).toString(16);}); }
      const fid = id && typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : uuidV4();

      const rows = await sql`INSERT INTO fluxos (id, projeto_id, owner_id, nome, slug, config, blocos)
        VALUES (${fid}::uuid, ${projeto_id}, ${user.id}, ${nome || "Novo fluxo"}, ${slug || ""}, ${sql.json(config)}, ${sql.json(blocos)})
        ON CONFLICT (id) DO UPDATE SET
          nome = EXCLUDED.nome, slug = EXCLUDED.slug, config = EXCLUDED.config,
          blocos = EXCLUDED.blocos, atualizado_em = now()
        RETURNING id, nome, slug, config, blocos, publicado, criado_em, atualizado_em`;
      return res.status(201).json(rows[0]);
    }

    if (req.method === "PUT") {
      if (!user) return res.status(401).json({ erro: "Nao autorizado." });
      const body = parseBody(req);
      const { id, nome, slug, publicado } = body;
      const config = body.config !== undefined ? (typeof body.config === "string" ? JSON.parse(body.config) : body.config) : undefined;
      const blocos = body.blocos !== undefined ? (typeof body.blocos === "string" ? JSON.parse(body.blocos) : body.blocos) : undefined;
      if (!id) return res.status(400).json({ erro: "ID obrigatorio." });

      let sets = [];
      let params = [];
      let i = 1;
      if (nome !== undefined) { sets.push(`nome = $${i++}`); params.push(nome); }
      if (slug !== undefined) { sets.push(`slug = $${i++}`); params.push(slug); }
      if (config !== undefined) { sets.push(`config = $${i}::jsonb`); params.push(JSON.stringify(config)); i++; }
      if (blocos !== undefined) { sets.push(`blocos = $${i}::jsonb`); params.push(JSON.stringify(blocos)); i++; }
      if (publicado !== undefined) { sets.push(`publicado = $${i++}`); params.push(publicado); }
      if (sets.length === 0) return res.status(400).json({ erro: "Nada para atualizar." });
      sets.push(`atualizado_em = now()`);
      params.push(id, user.id);
      const rows = await sql.unsafe(
        `UPDATE fluxos SET ${sets.join(", ")} WHERE id = $${i++} AND owner_id = $${i} RETURNING id, nome, slug, config, blocos, publicado, criado_em, atualizado_em`,
        params
      );
      if (!rows.length) return res.status(404).json({ erro: "Fluxo nao encontrado." });
      return res.status(200).json(rows[0]);
    }

    if (req.method === "DELETE") {
      if (!user) return res.status(401).json({ erro: "Nao autorizado." });
      const { id } = req.query || {};
      if (!id) return res.status(400).json({ erro: "ID obrigatorio." });

      await sql`DELETE FROM fluxos WHERE id = ${id} AND owner_id = ${user.id}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ erro: "Metodo nao permitido." });
  } catch (e) {
    console.error("fluxos error:", e);
    return res.status(500).json({ erro: "Erro interno.", detalhe: e.message || String(e) });
  }
};
