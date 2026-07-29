const { Client } = require("pg");
const SUPA_URL = "postgresql://postgres.zyaqneyinfqhqvqrxdxj:96081025Aa%401@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";
const REAL = "285d9053-dde1-442a-a6cd-187791714a55";
const ORPHAN = "cfaa06d3-c717-40ba-ac09-1f61e5335110";

async function main() {
  const c = new Client({ connectionString: SUPA_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // Move orphan fluxos to real user
  const r1 = await c.query(`UPDATE fluxos SET owner_id=$1 WHERE owner_id=$2`, [REAL, ORPHAN]);
  console.log("Fluxos movidos:", r1.rowCount);

  await c.query(`UPDATE projetos SET owner_id=$1 WHERE owner_id=$2`, [REAL, ORPHAN]);
  await c.query(`UPDATE arquivos SET owner_id=$1 WHERE owner_id=$2`, [REAL, ORPHAN]);

  // Delete test/empty Meu atendimento without slug if duplicates
  const all = await c.query(`SELECT id, nome, slug FROM fluxos WHERE owner_id=$1 ORDER BY nome, atualizado_em DESC NULLS LAST`, [REAL]);
  console.log("Fluxos do user:");
  all.rows.forEach(f => console.log(" -", f.nome, "|", f.slug || "-", "|", f.id));

  const cnt = await c.query(`SELECT COUNT(*) FROM fluxos WHERE owner_id=$1`, [REAL]);
  console.log("Total:", cnt.rows[0].count);

  await c.end();
}
main().catch(e => console.error(e.message));
