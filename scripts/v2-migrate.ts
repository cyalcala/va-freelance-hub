import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const sql = postgres('postgresql://postgres:888%40Kaamulan7%40999@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres', {
  ssl: 'require',
  connect_timeout: 10
});

async function run() {
  console.log('🚀 Starting V2 Cooldown Schema migration...');
  const schemaPath = path.join(process.cwd(), 'scripts', 'v2-schema-cooldowns.sql');
  const query = fs.readFileSync(schemaPath, 'utf8');

  try {
    await sql.unsafe(query);
    console.log('✅ V2 Cooldown Schema deployed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
