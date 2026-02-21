import 'dotenv/config';
import { ClinicalFlag, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function assertNoActiveAppointmentOverlaps() {
  const overlaps = await prisma.$queryRaw<Array<{ id_a: string; id_b: string }>>`
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

  if (overlaps.length > 0) {
    const sample = overlaps.map((row) => `${row.id_a}<>${row.id_b}`).join(', ');
    throw new Error(`Seed generated overlapping active appointments: ${sample}`);
  }
}

async function main() {
  console.log('🌱 Starting seed...');

  // Create default user (clinician)
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'clinician@iljar.is' },
    update: {},
    create: {
      email: 'clinician@iljar.is',
      passwordHash,
      totpEnabled: false,
    },
  });
  console.log('✓ Created user:', user.email);

  // Create settings
  await prisma.settings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      slotLength: 30,
      bufferTime: 5,
      blockRedDays: false,
    },
  });
  console.log('✓ Created settings');

  await prisma.service.createMany({
    data: [
      { name: 'Full fótaaðgerð', durationMinutes: 60, isDefault: true },
      { name: 'Fótaaðgerð', durationMinutes: 30, isDefault: true },
      { name: 'Smáaðgerð', durationMinutes: 15, isDefault: true },
    ],
    skipDuplicates: true,
  });

  await prisma.service.updateMany({
    where: { name: 'Full fótaaðgerð' },
    data: { durationMinutes: 60, isDefault: true },
  });

  await prisma.service.updateMany({
    where: { name: 'Fótaaðgerð' },
    data: { durationMinutes: 30, isDefault: true },
  });

  await prisma.service.updateMany({
    where: { name: 'Smáaðgerð' },
    data: { durationMinutes: 15, isDefault: true },
  });
  console.log('✓ Created default services');

  await prisma.photo.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.client.deleteMany();
  await prisma.availabilityRule.deleteMany();
  await prisma.auditLog.deleteMany();
  console.log('✓ Cleared previous demo data');

  // Create availability rules (Monday-Friday, 9:00-17:00)
  const weekdays = [1, 2, 3, 4, 5]; // Monday-Friday
  for (const weekday of weekdays) {
    await prisma.availabilityRule.upsert({
      where: { id: `weekday-${weekday}` },
      update: {},
      create: {
        id: `weekday-${weekday}`,
        weekday,
        startTime: '09:00',
        endTime: '17:00',
      },
    });
  }
  console.log('✓ Created availability rules');

  // Create 10 synthetic clients
  const clientNames = [
    'Jón Jónsson',
    'Guðrún Guðmundsdóttir',
    'Ólafur Ólafsson',
    'Sigríður Sigurðardóttir',
    'Einar Einarsson',
    'Anna Árnadóttir',
    'Pétur Pétursson',
    'María Magnúsdóttir',
    'Bjarni Bjarnason',
    'Kristín Kristjánsdóttir',
  ];

  const clients = [];
  for (let i = 0; i < clientNames.length; i++) {
    const clinicalFlags: ClinicalFlag[] =
      i === 0
        ? [ClinicalFlag.DIABETES]
        : i === 1
          ? [ClinicalFlag.ANTICOAGULANT]
          : i === 2
            ? [ClinicalFlag.ALLERGY]
            : i === 3
              ? [ClinicalFlag.DIABETES, ClinicalFlag.ANTICOAGULANT]
              : i === 4
                ? [ClinicalFlag.NEUROPATHY]
                : [];

    const client = await prisma.client.create({
      data: {
        name: clientNames[i],
        phone: `5${String(i).padStart(6, '0')}`,
        kennitala: `${String(i + 1).padStart(2, '0')}0101-${String(2000 + i).padStart(4, '0')}`,
        clinicalFlags,
      },
    });
    clients.push(client);
  }
  console.log(`✓ Created ${clients.length} clients`);

  // Create 30 appointments across distinct upcoming business days
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const businessDays: Date[] = [];
  const cursor = new Date(now);
  while (businessDays.length < 10) {
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) {
      businessDays.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const slotHours = [9, 10, 14]; // 3 appointments per business day
  const appointments = [];

  for (let i = 0; i < 30; i++) {
    const day = new Date(businessDays[Math.floor(i / 3)]);
    day.setHours(slotHours[i % 3], 0, 0, 0);

    const startTime = new Date(day);
    const endTime = new Date(day);
    endTime.setMinutes(endTime.getMinutes() + 30);

    const clientIndex = i % clients.length;
    const status = i < 10 ? 'COMPLETED' : 'BOOKED';

    const appointment = await prisma.appointment.create({
      data: {
        clientId: clients[clientIndex].id,
        startTime,
        endTime,
        status,
        type: i % 3 === 0 ? 'Fyrsta viðtal' : 'Eftirfylgd',
        note: i % 5 === 0 ? 'Sjúklingur óskaði eftir snemmtíma.' : null,
      },
    });
    appointments.push(appointment);
  }
  console.log(`✓ Created ${appointments.length} appointments`);

  // Create visits for completed appointments
  const completedAppointments = appointments.filter((_, i) => i < 10);
  for (const appointment of completedAppointments) {
    await prisma.visit.create({
      data: {
        appointmentId: appointment.id,
        soapS: 'Sjúklingur lýsir verk í vinstri fæti, sérstaklega eftir göngu.',
        soapO: 'Væg bólga sést. Hreyfiferill eðlilegur. Engar sjáanlegar aflagnanir.',
        soapA: 'Líkleg plantarfasciitis. Engin merki um sýkingu.',
        soapP: 'Mælt með teygjuæfingum. Eftirfylgd eftir 2 vikur. Meta innlegg ef einkenni lagast ekki.',
      },
    });
  }
  console.log(`✓ Created ${completedAppointments.length} visits`);

  // Create audit log entries
  for (let i = 0; i < 5; i++) {
    await prisma.auditLog.create({
      data: {
        entityType: 'Client',
        entityId: clients[i].id,
        action: 'CREATE',
        userId: user.id,
      },
    });
  }
  console.log('✓ Created audit log entries');

  await assertNoActiveAppointmentOverlaps();
  console.log('✓ Verified no overlapping active appointments');

  console.log('✅ Seed completed successfully!');
  console.log('\nTest credentials:');
  console.log('  Email: clinician@iljar.is');
  console.log('  Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
