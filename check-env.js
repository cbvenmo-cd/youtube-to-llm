console.log('=== Environment Variable Check ===\n');

// Check if DATABASE_URL is set
const dbUrl = process.env.DATABASE_URL;
console.log('DATABASE_URL exists:', !!dbUrl);

if (dbUrl) {
  // Parse the URL
  const url = new URL(dbUrl);
  console.log('\nParsed DATABASE_URL:');
  console.log('- Protocol:', url.protocol);
  console.log('- Username:', url.username);
  console.log('- Password:', url.password ? '[HIDDEN]' : 'NOT SET');
  console.log('- Hostname:', url.hostname);
  console.log('- Port:', url.port);
  console.log('- Database:', url.pathname.slice(1));
  console.log('- Parameters:', url.search);
  
  // Check for pgbouncer
  console.log('\nConnection pooling:');
  console.log('- Uses PgBouncer:', url.searchParams.get('pgbouncer'));
  console.log('- Connection limit:', url.searchParams.get('connection_limit'));
  console.log('- Connect timeout:', url.searchParams.get('connect_timeout'));
}

// Check NODE_ENV
console.log('\nNODE_ENV:', process.env.NODE_ENV);

// List all env vars (without values for security)
console.log('\nAll environment variables:');
Object.keys(process.env).sort().forEach(key => {
  if (key.includes('PASSWORD') || key.includes('KEY') || key.includes('SECRET')) {
    console.log(`- ${key}: [HIDDEN]`);
  } else {
    console.log(`- ${key}: ${process.env[key]}`);
  }
});
