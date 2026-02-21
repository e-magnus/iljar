import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const overlapRows = await prisma.$queryRaw<Array<{ id_a: string; id_b: string }>>`
      SELECT a."id" AS id_a, b."id" AS id_b
      FROM "Appointment" a
      JOIN "Appointment" b
        ON a."id" < b."id"
       AND a."status" <> 'CANCELLED'::"AppointmentStatus"
       AND b."status" <> 'CANCELLED'::"AppointmentStatus"
       AND a."startTime" < b."endTime"
       AND a."endTime" > b."startTime"
      LIMIT 20
    `;

    if (overlapRows.length > 0) {
      console.error('❌ Dev startup blocked: active appointments overlap.');
      console.error('   Þetta þýðir að tvær eða fleiri bókanir skarast í tíma.');
      console.error('   Lagfæring: keyrðu `npm run seed` eða leiðréttu bókanir í gagnagrunni.');
      for (const row of overlapRows) {
        console.error(`   - Overlap: ${row.id_a} <> ${row.id_b}`);
      }
      process.exit(1);
    }

    console.log('✓ Seed sanity check passed: no overlapping active appointments found');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('❌ overlap sanity check failed unexpectedly.');
  console.error('   Athugaðu DATABASE_URL og gagnagrunnstengingu.');
  console.error(error);
  process.exit(1);
});
