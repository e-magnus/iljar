import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';

import { prisma } from '@/lib/db/prisma';
import { generateAccessToken } from '@/lib/auth/jwt';
import { POST as createAppointment } from '@/app/api/appointments/route';

function requestFor(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(url, options);
}

test('concurrent bookings for the same time allow only one success and one conflict', async (t) => {
  const suffix = randomUUID().slice(0, 8);

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    t.skip(`Database not available for integration test: ${(error as Error).message}`);
    return;
  }

  const client = await prisma.client.create({
    data: {
      name: `Race Client ${suffix}`,
      phone: `555${Date.now().toString().slice(-6)}`,
    },
  });

  const token = generateAccessToken({
    userId: `test-user-${suffix}`,
    email: `test-${suffix}@iljar.is`,
  });

  const start = new Date();
  start.setDate(start.getDate() + 180);
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 20 * 60 * 1000);

  const payload = {
    clientId: client.id,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    type: 'Race test service',
  };

  const headers = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  };

  try {
    const [resA, resB] = await Promise.all([
      createAppointment(
        requestFor('http://localhost/api/appointments', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })
      ),
      createAppointment(
        requestFor('http://localhost/api/appointments', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })
      ),
    ]);

    const statuses = [resA.status, resB.status].sort((a, b) => a - b);
    assert.deepEqual(statuses, [201, 409]);

    const conflictResponse = resA.status === 409 ? resA : resB;
    const conflictBody = await conflictResponse.json();
    assert.equal(conflictBody.error, 'Time slot is already booked');
  } finally {
    await prisma.appointment.deleteMany({ where: { clientId: client.id } });
    await prisma.client.delete({ where: { id: client.id } });
  }
});
