const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { prepare: false });

module.exports = { sql };
