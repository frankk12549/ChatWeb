const { Client } = require("pg");

async function main() {
  // Direct (non-pooler)
  const url = "postgresql://neondb_owner:npg_r2YRAw0NTVvj@ep-curly-water-acun4wv4.sa-east-1.aws.neon.tech/neondb?sslmode=require";
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 10000 });
  try {
    await client.connect();
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    tables.rows.forEach(t => console.log(t.table_name));
  } catch(e) { console.log("Erro:", e.message); }
  await client.end();
}
main();
