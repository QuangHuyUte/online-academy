// utils/database.js
import knex from 'knex';

const db = knex({
  client: 'pg',
  connection: {
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.anvurmbutyvmzanonbyh',
    password: 'Phucle@2608',
    database: 'postgres',
    ssl: { rejectUnauthorized: false } 
  },
  pool: { min: 0, max: 15 },
});

export default db;

