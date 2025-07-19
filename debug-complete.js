const dns = require('dns');
const { promisify } = require('util');
const net = require('net');

// Promisify DNS functions
const lookup = promisify(dns.lookup);
const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

async function debugConnection() {
  console.log('=== Comprehensive Database Connection Debug ===\n');
  
  // Check current DNS settings
  console.log('DNS Result Order:', dns.getDefaultResultOrder());
  
  const host = 'db.bffntkxbpisvdygxgord.supabase.co';
  const port = 5432;
  
  try {
    // Test DNS lookup
    console.log('\n1. Testing DNS lookup:');
    const lookupResult = await lookup(host);
    console.log('   Lookup result:', lookupResult);
    
    // Test resolve4
    console.log('\n2. Testing IPv4 resolution:');
    try {
      const ipv4Results = await resolve4(host);
      console.log('   IPv4 addresses:', ipv4Results);
    } catch (e) {
      console.log('   IPv4 resolution failed:', e.message);
    }
    
    // Test resolve6
    console.log('\n3. Testing IPv6 resolution:');
    try {
      const ipv6Results = await resolve6(host);
      console.log('   IPv6 addresses:', ipv6Results);
    } catch (e) {
      console.log('   IPv6 resolution failed:', e.message);
    }
    
    // Force IPv4 and test again
    console.log('\n4. Forcing IPv4 and testing again:');
    dns.setDefaultResultOrder('ipv4first');
    console.log('   DNS Result Order now:', dns.getDefaultResultOrder());
    const lookupResult2 = await lookup(host);
    console.log('   Lookup result after forcing IPv4:', lookupResult2);
    
    // Test TCP connection
    console.log('\n5. Testing TCP connection to database:');
    await testTcpConnection(lookupResult2.address, port);
    
  } catch (error) {
    console.error('Error during debug:', error);
  }
}

function testTcpConnection(host, port) {
  return new Promise((resolve, reject) => {
    console.log(`   Attempting connection to ${host}:${port}...`);
    
    const socket = new net.Socket();
    
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
      console.log(`   ✅ Successfully connected to ${host}:${port}`);
      socket.end();
      resolve();
    });
    
    socket.on('timeout', () => {
      console.log(`   ❌ Connection timeout to ${host}:${port}`);
      socket.destroy();
      reject(new Error('Connection timeout'));
    });
    
    socket.on('error', (err) => {
      console.log(`   ❌ Connection error to ${host}:${port}:`, err.message);
      reject(err);
    });
    
    socket.connect(port, host);
  });
}

// Also test with Prisma
async function testPrisma() {
  console.log('\n6. Testing Prisma connection:');
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({
      log: ['info', 'warn', 'error'],
    });
    
    await prisma.$connect();
    console.log('   ✅ Prisma connected successfully');
    
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('   ✅ Query successful:', result);
    
    await prisma.$disconnect();
  } catch (error) {
    console.log('   ❌ Prisma error:', error.message);
  }
}

// Run all tests
debugConnection().then(() => testPrisma()).catch(console.error);
