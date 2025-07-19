const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient({
    log: ['info', 'warn', 'error'],
  });

  try {
    console.log('Testing database connection with optimized settings...');
    console.log('DATABASE_URL parameters:', process.env.DATABASE_URL?.split('?')[1] || 'No parameters');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Successfully connected to database');
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database query successful:', result);
    
    // Test VideoAnalysis table
    const count = await prisma.videoAnalysis.count();
    console.log('✅ VideoAnalysis table accessible, count:', count);
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
