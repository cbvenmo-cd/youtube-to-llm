const { PrismaClient } = require('@prisma/client');
const dns = require('dns');

// Force IPv4 resolution
dns.setDefaultResultOrder('ipv4first');

async function testConnection() {
  console.log('Testing Prisma connection with IPv4 preference...\n');
  
  const prisma = new PrismaClient({
    log: ['info', 'warn', 'error'],
  });

  try {
    await prisma.$connect();
    console.log('✅ Successfully connected to database');
    
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database query successful:', result);
    
    const count = await prisma.videoAnalysis.count();
    console.log('✅ VideoAnalysis table accessible, count:', count);
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
