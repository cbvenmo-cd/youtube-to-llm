const { Client } = require('pg');

async function testDirectConnection() {
  console.log('Testing different connection string formats...\n');
  
  const password = 'tef*pwg7kbj3nmx5MCX';
  const projectRef = 'bffntkxbpisvdygxgord';
  
  // Test different username formats
  const configs = [
    {
      name: 'Format 1: postgres.projectRef',
      connectionString: `postgresql://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
    },
    {
      name: 'Format 2: postgres.projectRef with SSL',
      connectionString: `postgresql://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require`
    },
    {
      name: 'Format 3: Just projectRef',
      connectionString: `postgresql://${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
    }
  ];
  
  for (const config of configs) {
    console.log(`\nTesting ${config.name}:`);
    console.log(`Connection string: ${config.connectionString.replace(password, '[HIDDEN]')}`);
    
    const client = new Client({
      connectionString: config.connectionString
    });
    
    try {
      await client.connect();
      const result = await client.query('SELECT 1 as test');
      console.log('✅ Success:', result.rows);
      await client.end();
      
      // If successful, return this format
      console.log('\n✅ WORKING FORMAT FOUND!');
      console.log('Update your .env DATABASE_URL to:');
      console.log(`DATABASE_URL=${config.connectionString}?pgbouncer=true&connection_limit=1`);
      break;
      
    } catch (error) {
      console.log('❌ Failed:', error.message);
      await client.end().catch(() => {});
    }
  }
}

testDirectConnection();
