const jwt = require("jsonwebtoken");
const { sql } = require("./_db");

const SECRET = process.env.JWT_SECRET || "fallback-secret";

function verificarToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  try { return jwt.verify(auth.slice(7), SECRET); } catch (e) { return null; }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const user = verificarToken(req);

    // GET — pode ser público (slug lookup) ou autenticado (lista do dono)
    if (req.method === "GET") {
      const { slug, owner_id, id } = req.query || {};

      // Busca por slug (público — lead abre o link)
      if (slug) {
        const rows = await sql`SELECT id, nome, slug, config, blocos, publicado, owner_id FROM fluxos WHERE slug = ${slug} LIMIT 1`;
        if (!rows.length) return res.status(404).json({ erro: "Funil não encontrado." });
        return res.status(200).json(rows[0]);
      }

      // Lista por owner (autenticado)
      if (!user) return res.status(401).json({ erro: "Não autorizado." });
      const oid = owner_id || user.id;
      const rows = await sql`SELECT id, nome, slug, config, blocos, publicado, criado_em, atualizado_em FROM fluxos WHERE owner_id = ${oid} ORDER BY atualizado_em DESC`;
      return res.status(200).json(Array.from(rows));
    }

    // POST — cria fluxo (autenticado)
    if (req.method === "POST") {
      if (!user) return res.status(401).json({ erro: "Não autorizado." });
      const { id, nome, slug, config, blocos } = req.body || {};

      // Garante que o projeto/owner existe
      let proj = await sql`SELECT id FROM projetos WHERE owner_id = ${user.id} LIMIT 1`;
      if (!proj.length) {
        proj = await sql`INSERT INTO projetos (owner_id) VALUES (${user.id}) RETURNING id`;
      }
      const projeto_id = proj[0].id;

      // Usa ID do cliente se fornecido, senão gera novo
      const fid = id && typeof id === "string" && id.length > 3 ? id : "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

      const rows = await sql`INSERT INTO fluxos (id, projeto_id, owner_id, nome, slug, config, blocos)
        VALUES (${fid}, ${projeto_id}, ${user.id}, ${nome || "Novo fluxo"}, ${slug || ""}, ${JSON.stringify(config || {})}, ${JSON.stringify(blocos || [])})
        RETURNING id, nome, slug, config, blocos, publicado, criado_em, atualizado_em`;
      return res.status(201).json(rows[0]);
    }

    // PUT — atualiza fluxo (autenticado)
    if (req.method === "PUT") {
      if (!user) return res.status(401).json({ erro: "Não autorizado." });
      const { id, nome, slug, config, blocos, publicado } = req.body || {};
      if (!id) return res.status(400).json({ erro: "ID obrigatório." });

      const rows = await sql`UPDATE fluxos SET
        nome = COALESCE(${nome}, nome),
        slug = COALESCE(${slug}, slug),
        config = COALESCE(${config ? JSON.stringify(config) : null}::jsonb, config),
        blocos = COALESCE(${blocos ? JSON.stringify(blocos) : null}::jsonb, blocos),
        publicado = COALESCE(${publicado}, publicado),
        atualizado_em = now()
        WHERE id = ${id} AND owner_id = ${user.id}
        RETURNING id, nome, slug, config, blocos, publicado, criado_em, atualizado_em`;
      if (!rows.length) return res.status(404).json({ erro: "Fluxo não encontrado." });
      return res.status(200).json(rows[0]);
    }

    // DELETE — exclui fluxo (autenticado)
    if (req.method === "DELETE") {
      if (!user) return res.status(401).json({ erro: "Não autorizado." });
      const { id } = req.query || {};
      if (!id) return res.status(400).json({ erro: "ID obrigatório." });

      await sql`DELETE FROM fluxos WHERE id = ${id} AND owner_id = ${user.id}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ erro: "Método não permitido." });
  } catch (e) {
    console.error("fluxos error:", e);
    return res.status(500).json({ erro: "Erro interno.", detalhe: e.message || String(e) });
  }
};
