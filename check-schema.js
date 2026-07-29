const { Client } = require("pg");

const NEON_URL = "postgresql://neondb_owner:npg_r2YRAw0NTVvj@ep-curly-water-acun4wv4-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const SUPA_URL = "postgresql://postgres.zyaqneyinfqhqvqrxdxj:96081025Aa%401@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";

async function cols(client, table) {
  const r = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
    [table]
  );
  return r.rows;
}

async function main() {
  const neon = new Client({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });
  const supa = new Client({ connectionString: SUPA_URL, ssl: { rejectUnauthorized: false } });
  await neon.connect();
  await supa.connect();
  console.log("OK");

  for (const t of ["arquivos", "mensagens", "eventos", "usuarios", "fluxos", "projetos", "sessoes", "respostas"]) {
    const nc = await cols(neon, t).catch(() => []);
    const sc = await cols(supa, t).catch(() => []);
    console.log("\n" + t.toUpperCase());
    console.log("  Neon:", nc.map(c => c.column_name).join(", ") || "(nao existe)");
    console.log("  Supa:", sc.map(c => c.column_name).join(", ") || "(nao existe)");
  }

  // Sample one row of each
  for (const t of ["arquivos", "mensagens", "eventos"]) {
    const r = await neon.query(`SELECT * FROM ${t} LIMIT 1`);
    if (r.rows[0]) console.log("\nSample", t, Object.keys(r.rows[0]));
  }

  await neon.end();
  await supa.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
