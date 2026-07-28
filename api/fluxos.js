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
      // Debug: retorna o body bruto ANTES de qualquer validação
      return res.status(200).json({
        hasUser: !!user,
        userId: user?.id,
        bodyType: typeof req.body,
        bodyIsNull: req.body === null,
        bodyKeys: req.body && typeof req.body === "object" ? Object.keys(req.body).join(",") : "N/A",
        bodyStr: typeof req.body === "string" ? req.body.substring(0, 300) : "not string",
        contentType: req.headers["content-type"]
      });
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
    return res.status(500).json({ erro: "Erro interno.", detalhe: e.message || String(e), code: e.code, severity: e.severity, detail: e.detail, hint: e.hint, position: e.position });
  }
};
