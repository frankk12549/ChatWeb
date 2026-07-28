const postgres = require("postgres");
const url = "postgresql://postgres.zyaqneyinfqhqvqrxdxj:96081025Aa%401@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";
console.log("Connecting to Supabase...");
const sql = postgres(url, { prepare: false, ssl: { rejectUnauthorized: false } });
sql`SELECT 1 as ok`.then(r => {
  console.log("OK:", JSON.stringify(r));
  sql.end();
  process.exit(0);
}).catch(e => {
  console.error("ERRO:", e.message);
  sql.end();
  process.exit(1);
});
