import 'dotenv/config';
import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const [user, clientCount, appointmentCount] = await Promise.all([
      prisma.user.findUnique({
        where: { email: 'clinician@iljar.is' },
        select: { id: true },
      }),
      prisma.client.count(),
      prisma.appointment.count(),
    ]);

    const hasSeedData = Boolean(user) && clientCount > 0 && appointmentCount > 0;

    if (hasSeedData) {
      console.log('✓ Seed data already present, skipping seed');
      return;
    }

    console.log('🌱 Seed data missing, running npm run seed...');
    execSync('npm run seed', { stdio: 'inherit' });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('❌ ensure-seed failed:', error);
  process.exit(1);
});
