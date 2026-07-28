const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

module.exports = { sql };
