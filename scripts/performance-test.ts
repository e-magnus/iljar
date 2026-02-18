import { performance } from 'perf_hooks';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function setupTestData() {
  console.log('Setting up test data...');
  
  // Create 100 appointments for testing
  const now = new Date();
  const clients = await prisma.client.findMany({ take: 10 });
  
  if (clients.length === 0) {
    console.error('No clients found. Please run seed script first.');
    process.exit(1);
  }

  // Delete existing test appointments
  await prisma.appointment.deleteMany({
    where: {
      note: 'PERFORMANCE_TEST',
    },
  });

  // Create 100 appointments spread over the next 30 days
  const appointments = [];
  for (let i = 0; i < 100; i++) {
    const daysFromNow = Math.floor(i / 10);
    const date = new Date(now);
    date.setDate(date.getDate() + daysFromNow);
    
    // Skip weekends
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }
    
    const hour = 9 + (i % 8);
    date.setHours(hour, 0, 0, 0);
    
    const startTime = new Date(date);
    const endTime = new Date(date);
    endTime.setMinutes(endTime.getMinutes() + 30);
    
    appointments.push({
      clientId: clients[i % clients.length].id,
      startTime,
      endTime,
      status: 'BOOKED' as const,
      note: 'PERFORMANCE_TEST',
    });
  }

  await prisma.appointment.createMany({ data: appointments });
  console.log('✓ Created 100 test appointments');
}

async function testSlotGeneration() {
  console.log('\n=== Slot Generation Performance Test ===\n');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // Import the slot generation function
  // Note: This is a dynamic import to work around TypeScript module issues
  const { generateSlots } = await import('../src/lib/services/slots.js');

  // Warm-up run
  await generateSlots({ date: tomorrow });

  // Run 10 tests
  const runs = 10;
  const times: number[] = [];

  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    await generateSlots({ date: tomorrow });
    const end = performance.now();
    const duration = end - start;
    times.push(duration);
    console.log(`Run ${i + 1}: ${duration.toFixed(2)}ms`);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const max = Math.max(...times);
  const min = Math.min(...times);

  console.log('\n=== Results ===');
  console.log(`Average: ${avg.toFixed(2)}ms`);
  console.log(`Min: ${min.toFixed(2)}ms`);
  console.log(`Max: ${max.toFixed(2)}ms`);
  
  if (avg < 1000) {
    console.log('✅ PASS: Average response time is under 1 second');
  } else {
    console.log('❌ FAIL: Average response time exceeds 1 second');
  }
}

async function cleanup() {
  console.log('\n=== Cleanup ===');
  await prisma.appointment.deleteMany({
    where: {
      note: 'PERFORMANCE_TEST',
    },
  });
  console.log('✓ Cleaned up test appointments');
}

async function main() {
  try {
    await setupTestData();
    await testSlotGeneration();
  } catch (error) {
    console.error('Error running performance test:', error);
    process.exit(1);
  } finally {
    await cleanup();
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
