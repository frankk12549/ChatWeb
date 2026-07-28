const postgres = require("./node_modules/postgres");
const sql = postgres("postgresql://postgres.zyaqneyinfqhqvqrxdxj:%5B96081025Aa%401%5D@aws-0-sa-east-1.pooler.supabase.com:6543/postgres", { prepare: false });
sql.unsafe("SELECT 1 as ok").then(r => {
  console.log("OK:", JSON.stringify(r));
  process.exit(0);
}).catch(e => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
