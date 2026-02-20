import 'dotenv/config';
import { ClinicalFlag, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
    },
  });
  console.log('✓ Created settings');

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

  // Create 30 appointments over the next 2 weeks
  const now = new Date();
  const appointments = [];
  
  for (let i = 0; i < 30; i++) {
    const daysFromNow = Math.floor(i / 3); // 3 appointments per day
    const appointmentDate = new Date(now);
    appointmentDate.setDate(appointmentDate.getDate() + daysFromNow);
    
    // Skip weekends
    while (appointmentDate.getDay() === 0 || appointmentDate.getDay() === 6) {
      appointmentDate.setDate(appointmentDate.getDate() + 1);
    }
    
    // Set time slots: 9:00, 10:00, 11:00, 13:00, 14:00, 15:00, 16:00
    const timeSlot = i % 3;
    const hours = timeSlot === 0 ? 9 : timeSlot === 1 ? 10 : 14;
    appointmentDate.setHours(hours, 0, 0, 0);
    
    const startTime = new Date(appointmentDate);
    const endTime = new Date(appointmentDate);
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
