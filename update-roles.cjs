// Quick script to update admin roles to owner
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updateRoles() {
  try {
    const result = await pool.query("UPDATE group_members SET role = 'owner' WHERE role = 'admin'");
    console.log('Updated', result.rowCount, 'rows from admin to owner');
    
    const result2 = await pool.query("UPDATE group_members SET role = 'host' WHERE role = 'moderator'");
    console.log('Updated', result2.rowCount, 'rows from moderator to host');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

updateRoles();
