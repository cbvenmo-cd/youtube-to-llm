const https = require('https');
const http = require('http');
const dns = require('dns');
const { promisify } = require('util');
const lookupAsync = promisify(dns.lookup);

console.log('=== Docker Container Network Debug ===\n');

// Check environment variables
console.log('Environment Variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (length: ' + process.env.DATABASE_URL.length + ')' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

// Extract and test database host
async function testDatabaseConnection() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('\n❌ DATABASE_URL not found!');
    return;
  }

  const match = dbUrl.match(/@([^:]+):(\d+)/);
  if (!match) {
    console.log('\n❌ Could not parse DATABASE_URL');
    return;
  }

  const host = match[1];
  const port = match[2];
  console.log('\nDatabase connection info:');
  console.log('Host:', host);
  console.log('Port:', port);

  // Test DNS resolution
  console.log('\nTesting DNS resolution...');
  try {
    const result = await lookupAsync(host);
    console.log('✅ DNS resolved to:', result.address);
  } catch (error) {
    console.log('❌ DNS resolution failed:', error.message);
  }

  // Test HTTPS connectivity to a known endpoint
  console.log('\nTesting external connectivity...');
  await testHttpsConnection('www.google.com', '/');

  // Test connection to Supabase API (not the database directly)
  console.log('\nTesting Supabase API connectivity...');
  const supabaseProject = host.split('.')[1]; // Extract project ID
  await testHttpsConnection(`${supabaseProject}.supabase.co`, '/');
}

function testHttpsConnection(hostname, path) {
  return new Promise((resolve) => {
    const options = {
      hostname,
      port: 443,
      path,
      method: 'GET',
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      console.log(`✅ HTTPS connection to ${hostname}: ${res.statusCode}`);
      resolve();
    });

    req.on('error', (error) => {
      console.log(`❌ HTTPS connection to ${hostname} failed:`, error.message);
      resolve();
    });

    req.on('timeout', () => {
      console.log(`❌ HTTPS connection to ${hostname} timed out`);
      req.destroy();
      resolve();
    });

    req.end();
  });
}

// Test file system access
console.log('\nChecking file system...');
const fs = require('fs');
try {
  const envExists = fs.existsSync('.env');
  console.log('.env file exists:', envExists);
  
  if (envExists) {
    const envContent = fs.readFileSync('.env', 'utf8');
    console.log('.env file size:', envContent.length, 'bytes');
    const hasDbUrl = envContent.includes('DATABASE_URL');
    console.log('Contains DATABASE_URL:', hasDbUrl);
  }
} catch (error) {
  console.log('Error reading .env:', error.message);
}

// Run tests
testDatabaseConnection().catch(console.error);
