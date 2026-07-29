const { Client } = require("pg");
const SUPA_URL = "postgresql://postgres.zyaqneyinfqhqvqrxdxj:96081025Aa%401@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";

async function main() {
  const c = new Client({ connectionString: SUPA_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const users = await c.query("SELECT id, email, nome, aprovado FROM usuarios ORDER BY criado_em");
  console.log("USERS:");
  users.rows.forEach(u => console.log(u.id, u.email, u.aprovado));

  const fluxos = await c.query("SELECT id, nome, slug, owner_id FROM fluxos ORDER BY owner_id, nome");
  console.log("\nFLUXOS by owner:");
  fluxos.rows.forEach(f => console.log(f.owner_id, "|", f.nome, "|", f.slug || "-"));

  // Count per owner
  const cnt = await c.query("SELECT owner_id, COUNT(*) FROM fluxos GROUP BY owner_id");
  console.log("\nCOUNT:");
  cnt.rows.forEach(r => console.log(r.owner_id, r.count));

  await c.end();
}
main().catch(e => console.error(e.message));
