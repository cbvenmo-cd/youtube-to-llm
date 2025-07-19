const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  console.log('Testing database connection...\n');
  
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    await prisma.$connect();
    console.log('✅ Connected successfully!');
    
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query successful:', result);
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error type:', error.constructor.name);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
