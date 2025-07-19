// Parse the DATABASE_URL to extract components
const dbUrl = process.env.DATABASE_URL;
console.log('Current DATABASE_URL:', dbUrl);

// Extract project ref and password
const urlPattern = /postgresql:\/\/postgres:([^@]+)@db\.([^.]+)\.supabase\.co/;
const match = dbUrl.match(urlPattern);

if (match) {
  const password = match[1];
  const projectRef = match[2];
  
  console.log('\nProject Reference:', projectRef);
  console.log('Password: [HIDDEN]');
  
  console.log('\nCorrect Transaction Pooler URL (for your .env file):');
  console.log(`DATABASE_URL=postgresql://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&connect_timeout=60&pool_timeout=60&socket_timeout=60`);
  
  console.log('\nAlternative Session Pooler URL (if you need session-based features):');
  console.log(`DATABASE_URL=postgresql://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`);
}
