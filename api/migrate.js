const { sql } = require("./_db");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ erro: "Use GET." });

  try {
    await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS aprovado BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS dominio TEXT DEFAULT ''`;
    await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS config_jsonb JSONB DEFAULT '{}'`;
    await sql`UPDATE usuarios SET aprovado = true WHERE email = 'leoconceicao18@gmail.com'`;
    await sql`CREATE TABLE IF NOT EXISTS arquivos (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      fluxo_id TEXT NOT NULL,
      chave TEXT NOT NULL,
      dados TEXT NOT NULL,
      criado_em TIMESTAMPTZ DEFAULT now()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_arquivos_fluxo ON arquivos(fluxo_id)`;
    await sql`ALTER TABLE fluxos ADD COLUMN IF NOT EXISTS owner_id TEXT`;
    await sql`ALTER TABLE fluxos ADD COLUMN IF NOT EXISTS projeto_id TEXT`;
    await sql`ALTER TABLE fluxos ADD COLUMN IF NOT EXISTS slug TEXT DEFAULT ''`;
    await sql`ALTER TABLE fluxos ADD COLUMN IF NOT EXISTS publicado BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE fluxos ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT now()`;
    await sql`ALTER TABLE fluxos ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT now()`;
    try { await sql`DROP TABLE IF EXISTS mensagens CASCADE`; } catch (e) {}
    await sql`CREATE TABLE mensagens (
      id TEXT PRIMARY KEY,
      sessao_id TEXT NOT NULL,
      fluxo_id TEXT,
      remetente TEXT NOT NULL,
      texto TEXT DEFAULT '',
      criado_em TIMESTAMPTZ DEFAULT now()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_mensagens_sessao ON mensagens(sessao_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_mensagens_criado ON mensagens(criado_em)`;
    try { await sql`DROP TABLE IF EXISTS eventos CASCADE`; } catch (e) {}
    await sql`CREATE TABLE eventos (
      id TEXT PRIMARY KEY,
      fluxo_id TEXT,
      sessao_id TEXT,
      tipo TEXT NOT NULL,
      dados JSONB DEFAULT '{}',
      criado_em TIMESTAMPTZ DEFAULT now()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_eventos_fluxo ON eventos(fluxo_id)`;
    const rows = await sql`SELECT id, email, nome, aprovado, dominio, config_jsonb FROM usuarios ORDER BY criado_em DESC`;
    return res.status(200).json({ ok: true, usuarios: rows });
  } catch (e) {
    console.error("migrate error:", e);
    return res.status(500).json({ erro: e.message });
  }
};
