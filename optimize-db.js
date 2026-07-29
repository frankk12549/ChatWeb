const { Client } = require("pg");
const SUPA_URL = "postgresql://postgres.zyaqneyinfqhqvqrxdxj:96081025Aa%401@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";

async function main() {
  const c = new Client({ connectionString: SUPA_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // Show current indexes
  const idx = await c.query(`SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('fluxos','arquivos','eventos','mensagens','projetos','usuarios')`);
  console.log("INDEXES ATUAIS:");
  idx.rows.forEach(r => console.log(`  ${r.tablename}.${r.indexname}`));

  // Add missing indexes
  console.log("\nCRIANDO INDEXES FALTANTES...");

  await c.query(`CREATE INDEX IF NOT EXISTS idx_fluxos_owner ON fluxos(owner_id)`);
  console.log("  + idx_fluxos_owner");

  await c.query(`CREATE INDEX IF NOT EXISTS idx_fluxos_slug ON fluxos(slug)`);
  console.log("  + idx_fluxos_slug");

  await c.query(`CREATE INDEX IF NOT EXISTS idx_fluxos_atualizado ON fluxos(atualizado_em DESC NULLS LAST)`);
  console.log("  + idx_fluxos_atualizado");

  await c.query(`CREATE INDEX IF NOT EXISTS idx_projetos_owner ON projetos(owner_id)`);
  console.log("  + idx_projetos_owner");

  // Verify
  const idx2 = await c.query(`SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('fluxos','arquivos','eventos','mensagens','projetos')`);
  console.log("\nINDEXES APOS:");
  idx2.rows.forEach(r => console.log(`  ${r.tablename}.${r.indexname}`));

  await c.end();
}
main().catch(e => console.error(e.message));
