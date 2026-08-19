import bcrypt from 'bcrypt';
import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex.raw('TRUNCATE TABLE rentals, vehicles, staff RESTART IDENTITY CASCADE');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  await knex('staff').insert({
    email: 'admin@rental.com',
    password_hash: passwordHash,
    name: 'Admin User',
  });

  const [camry, crv] = await knex('vehicles')
    .insert([
      {
        name: 'Toyota Camry',
        plate_number: 'ABC-1234',
        category: 'sedan',
        daily_rate: 45.0,
        photo_path: null,
      },
      {
        name: 'Honda CR-V',
        plate_number: 'XYZ-5678',
        category: 'suv',
        daily_rate: 65.0,
        photo_path: null,
      },
    ])
    .returning('id');

  if (!camry || !crv) {
    throw new Error('Failed to insert sample vehicles');
  }

  await knex('rentals').insert([
    {
      vehicle_id: camry.id,
      customer_name: 'John Doe',
      customer_phone: '+15551234001',
      start_date: '2026-07-28',
      end_date: '2026-08-03',
      total_amount: 315.0,
      status: 'completed',
    },
    {
      vehicle_id: crv.id,
      customer_name: 'Jane Smith',
      customer_phone: '+15551234002',
      start_date: '2026-08-18',
      end_date: '2026-08-22',
      total_amount: 325.0,
      status: 'ongoing',
    },
    {
      vehicle_id: camry.id,
      customer_name: 'Robert Chen',
      customer_phone: '+15551234003',
      start_date: '2026-08-25',
      end_date: '2026-08-27',
      total_amount: 135.0,
      status: 'booked',
    },
  ]);
}
