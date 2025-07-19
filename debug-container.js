const dns = require('dns');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

console.log('=== Docker Container Debug ===\n');

// Check environment variables
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (hidden)' : 'NOT SET');
console.log('DIRECT_URL:', process.env.DIRECT_URL ? 'Set (hidden)' : 'NOT SET');

// Extract host from DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  const match = dbUrl.match(/@([^:]+):/);
  if (match) {
    const host = match[1];
    console.log('\nDatabase host:', host);
    
    // Test DNS resolution
    dns.lookup(host, (err, address, family) => {
      if (err) {
        console.log('DNS lookup failed:', err.message);
      } else {
        console.log('DNS resolved to:', address);
      }
    });
    
    // Also try resolve4
    dns.resolve4(host, (err, addresses) => {
      if (err) {
        console.log('DNS resolve4 failed:', err.message);
      } else {
        console.log('DNS resolve4 addresses:', addresses);
      }
    });
  }
}

// Check network connectivity
async function checkNetwork() {
  try {
    // Check if we can ping google DNS
    const { stdout: ping1 } = await execPromise('ping -c 1 8.8.8.8').catch(e => ({ stdout: 'Ping failed: ' + e.message }));
    console.log('\nPing 8.8.8.8:', ping1.includes('1 received') ? 'Success' : 'Failed');
    
    // Check if we can resolve the supabase domain
    const { stdout: nslookup } = await execPromise('nslookup db.bffntkxbpisvdygxgord.supabase.co').catch(e => ({ stdout: 'nslookup failed: ' + e.message }));
    console.log('\nnslookup result:', nslookup);
    
    // Try curl to the database port
    const { stdout: nc } = await execPromise('nc -zv db.bffntkxbpisvdygxgord.supabase.co 5432 2>&1').catch(e => ({ stdout: 'nc failed: ' + e.message }));
    console.log('\nPort connectivity test:', nc);
    
  } catch (error) {
    console.error('Network check error:', error.message);
  }
}

checkNetwork();
