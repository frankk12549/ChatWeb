const postgres = require("postgres");

const neonUrl = "postgresql://neondb_owner:npg_r2YRAw0NTVvj@ep-curly-water-acun4wv4-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const supabaseUrl = "postgresql://postgres.zyaqneyinfqhqvqrxdxj:96081025Aa%401@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";

const neon = postgres(neonUrl, { prepare: false, ssl: { rejectUnauthorized: false } });
const supabase = postgres(supabaseUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

async function migrar() {
  const tables = ["usuarios", "projetos", "fluxos", "arquivos", "mensagens", "eventos"];
  const results = {};

  for (const table of tables) {
    try {
      const rows = await neon.unsafe(`SELECT * FROM ${table}`);
      results[table] = rows.length;
      if (rows.length > 0) {
        for (const row of rows) {
          const cols = Object.keys(row);
          const vals = cols.map((c, i) => row[c]);
          const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
          const query = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;
          await supabase.unsafe(query, vals);
        }
        console.log(`Migrados ${rows.length} registros de ${table}`);
      } else {
        console.log(`${table}: vazio no Neon`);
      }
    } catch (e) {
      console.log(`${table}: ERRO - ${e.message}`);
      results[table] = "erro: " + e.message;
    }
  }

  await neon.end();
  await supabase.end();
  console.log("\nResultado:", JSON.stringify(results));
}

migrar();
