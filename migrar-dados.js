const { Client } = require("pg");

const NEON_URL = "postgresql://neondb_owner:npg_r2YRAw0NTVvj@ep-curly-water-acun4wv4-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const SUPA_URL = "postgresql://postgres.zyaqneyinfqhqvqrxdxj:96081025Aa%401@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";

async function main() {
  const neon = new Client({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });
  const supa = new Client({ connectionString: SUPA_URL, ssl: { rejectUnauthorized: false } });
  await neon.connect();
  await supa.connect();
  console.log("Conectado");

  // Ensure schema
  await supa.query(`
    CREATE TABLE IF NOT EXISTS sessoes (
      id TEXT PRIMARY KEY,
      fluxo_id TEXT,
      sessao_id TEXT,
      lead_info JSONB DEFAULT '{}',
      criado_em TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS respostas (
      id TEXT PRIMARY KEY,
      sessao_id TEXT,
      fluxo_id TEXT,
      campo TEXT,
      valor TEXT,
      criado_em TIMESTAMPTZ DEFAULT now()
    );
    ALTER TABLE projetos ADD COLUMN IF NOT EXISTS dominio TEXT DEFAULT '';
    ALTER TABLE projetos ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ;
  `);
  console.log("Schema OK");

  // Users - all approved
  const users = await neon.query("SELECT * FROM usuarios");
  for (const u of users.rows) {
    await supa.query(`DELETE FROM usuarios WHERE email=$1 AND id<>$2`, [u.email, u.id]);
    await supa.query(
      `INSERT INTO usuarios (id, email, nome, senha_hash, aprovado, dominio, config_jsonb, ultimo_login, criado_em)
       VALUES ($1,$2,$3,$4,true,$5,$6::jsonb,$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         email=EXCLUDED.email, nome=EXCLUDED.nome, senha_hash=EXCLUDED.senha_hash,
         aprovado=true, dominio=EXCLUDED.dominio, config_jsonb=EXCLUDED.config_jsonb,
         ultimo_login=EXCLUDED.ultimo_login`,
      [u.id, u.email, u.nome || "", u.senha_hash, u.dominio || "",
       JSON.stringify(u.config_jsonb || {}), u.ultimo_login, u.criado_em]
    );
    console.log("User OK:", u.email, "(aprovado)");
  }

  // Projetos
  const projetos = await neon.query("SELECT * FROM projetos");
  for (const p of projetos.rows) {
    await supa.query(
      `INSERT INTO projetos (id, owner_id, dominio, criado_em, atualizado_em)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET owner_id=EXCLUDED.owner_id, dominio=EXCLUDED.dominio`,
      [p.id, p.owner_id, p.dominio || "", p.criado_em, p.atualizado_em]
    );
  }
  console.log("Projetos:", projetos.rows.length);

  // Fluxos
  const fluxos = await neon.query("SELECT * FROM fluxos");
  for (const f of fluxos.rows) {
    await supa.query(
      `INSERT INTO fluxos (id, projeto_id, owner_id, nome, slug, config, blocos, publicado, criado_em, atualizado_em)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         nome=EXCLUDED.nome, slug=EXCLUDED.slug, config=EXCLUDED.config, blocos=EXCLUDED.blocos,
         publicado=EXCLUDED.publicado, owner_id=EXCLUDED.owner_id, atualizado_em=EXCLUDED.atualizado_em`,
      [f.id, f.projeto_id, f.owner_id, f.nome || "Fluxo", f.slug || "",
       JSON.stringify(f.config || {}), JSON.stringify(f.blocos || []),
       !!f.publicado, f.criado_em, f.atualizado_em || f.criado_em]
    );
  }
  console.log("Fluxos:", fluxos.rows.length);

  // Arquivos
  const arquivos = await neon.query("SELECT * FROM arquivos");
  let arq = 0;
  for (const a of arquivos.rows) {
    await supa.query(
      `INSERT INTO arquivos (id, owner_id, fluxo_id, chave, dados, criado_em)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET dados=EXCLUDED.dados`,
      [a.id, a.owner_id, a.fluxo_id, a.chave, a.dados, a.criado_em]
    );
    arq++;
  }
  console.log("Arquivos:", arq);

  // Mensagens
  const mensagens = await neon.query("SELECT * FROM mensagens");
  let msg = 0;
  for (const m of mensagens.rows) {
    await supa.query(
      `INSERT INTO mensagens (id, sessao_id, fluxo_id, remetente, texto, criado_em)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
      [m.id, m.sessao_id, m.fluxo_id, m.remetente, m.texto, m.criado_em]
    );
    msg++;
  }
  console.log("Mensagens:", msg);

  // Eventos
  const eventos = await neon.query("SELECT * FROM eventos");
  let evt = 0;
  for (const e of eventos.rows) {
    await supa.query(
      `INSERT INTO eventos (id, fluxo_id, sessao_id, tipo, dados, criado_em)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6) ON CONFLICT (id) DO NOTHING`,
      [e.id, e.fluxo_id, e.sessao_id, e.tipo, JSON.stringify(e.dados || {}), e.criado_em]
    );
    evt++;
  }
  console.log("Eventos:", evt);

  // Sessoes
  const sessoes = await neon.query("SELECT * FROM sessoes").catch(() => ({ rows: [] }));
  for (const s of sessoes.rows) {
    await supa.query(
      `INSERT INTO sessoes (id, fluxo_id, sessao_id, lead_info, criado_em)
       VALUES ($1,$2,$3,$4::jsonb,$5) ON CONFLICT (id) DO NOTHING`,
      [s.id, s.fluxo_id, s.sessao_id, JSON.stringify(s.lead_info || {}), s.criado_em]
    );
  }
  console.log("Sessoes:", sessoes.rows.length);

  // Respostas
  const respostas = await neon.query("SELECT * FROM respostas").catch(() => ({ rows: [] }));
  for (const r of respostas.rows) {
    await supa.query(
      `INSERT INTO respostas (id, sessao_id, fluxo_id, campo, valor, criado_em)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
      [r.id, r.sessao_id, r.fluxo_id, r.campo, r.valor, r.criado_em]
    );
  }
  console.log("Respostas:", respostas.rows.length);

  // Delete test junk fluxos
  await supa.query(`DELETE FROM fluxos WHERE nome IN ('Teste Final','Test JSON','Teste') OR slug IN ('teste-final','test-json','teste-debug')`);

  // Verify
  const v = await supa.query(`
    SELECT
      (SELECT COUNT(*) FROM usuarios) as usuarios,
      (SELECT COUNT(*) FROM usuarios WHERE aprovado) as aprovados,
      (SELECT COUNT(*) FROM fluxos) as fluxos,
      (SELECT COUNT(*) FROM arquivos) as arquivos,
      (SELECT COUNT(*) FROM mensagens) as mensagens,
      (SELECT COUNT(*) FROM eventos) as eventos
  `);
  console.log("\n=== SUPABASE FINAL ===");
  console.log(v.rows[0]);

  const fl = await supa.query("SELECT nome, slug FROM fluxos ORDER BY nome");
  fl.rows.forEach(f => console.log(" -", f.nome, "|", f.slug || "-"));

  await neon.end();
  await supa.end();
  console.log("\nTUDO MIGRADO!");
}

main().catch(e => { console.error("FALHA:", e.message); process.exit(1); });
