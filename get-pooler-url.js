// Parse the DATABASE_URL to extract components
const dbUrl = process.env.DATABASE_URL;
console.log('Current DATABASE_URL:', dbUrl);

// The Transaction Pooler URL format should be:
// postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

// Extract project ref from the current URL
const match = dbUrl.match(/@db\.([^.]+)\.supabase\.co/);
if (match) {
  const projectRef = match[1];
  console.log('\nProject Reference:', projectRef);
  
  // Extract password
  const passwordMatch = dbUrl.match(/:([^@]+)@/);
  const password = passwordMatch ? passwordMatch[1] : '[PASSWORD]';
  
  console.log('\nYou should update your DATABASE_URL to use the Transaction Pooler:');
  console.log(`postgresql://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`);
  
  console.log('\nOr use the Session Pooler (if you need session-based features):');
  console.log(`postgresql://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`);
}
