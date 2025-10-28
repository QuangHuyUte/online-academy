// utils/database.js
import knex from 'knex';

const db = knex({
  client: 'pg',
  connection: {
    host: 'db.eaiaaadpuhpimnefmgac.supabase.co',
    port: 5432,
    user: 'postgres',
    password: 'truongvu123@#*',
    database: 'postgres',
    ssl: { rejectUnauthorized: false } 
  },
  pool: { min: 0, max: 15 },
});

export default db;

