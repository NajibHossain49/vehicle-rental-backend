import bcrypt from 'bcrypt';
import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex.raw('TRUNCATE TABLE rentals, vehicles, staff RESTART IDENTITY CASCADE');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  await knex('staff').insert([
    {
      email: 'admin@rental.com',
      password_hash: passwordHash,
      name: 'Admin User',
    },
    {
      email: 'manager@rental.com',
      password_hash: passwordHash,
      name: 'Fleet Manager',
    },
  ]);

  const vehicles = await knex('vehicles')
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
      {
        name: 'Nissan Sunny',
        plate_number: 'DHA-2291',
        category: 'sedan',
        daily_rate: 38.0,
        photo_path: null,
      },
      {
        name: 'Yamaha FZ-X',
        plate_number: 'CTG-7744',
        category: 'bike',
        daily_rate: 22.5,
        photo_path: null,
      },
      {
        name: 'Toyota Hiace',
        plate_number: 'KHL-1102',
        category: 'van',
        daily_rate: 90.0,
        photo_path: null,
      },
      {
        name: 'Suzuki Alto',
        plate_number: 'RAJ-3001',
        category: 'sedan',
        daily_rate: 25.0,
        photo_path: null,
        deleted_at: knex.fn.now(),
      },
    ])
    .returning(['id', 'plate_number']);

  const byPlate = Object.fromEntries(vehicles.map((row) => [row.plate_number, row.id]));

  const camry = byPlate['ABC-1234'];
  const crv = byPlate['XYZ-5678'];
  const sunny = byPlate['DHA-2291'];
  const yamaha = byPlate['CTG-7744'];
  const hiace = byPlate['KHL-1102'];

  if (!camry || !crv || !sunny || !yamaha || !hiace) {
    throw new Error('Failed to insert sample vehicles');
  }

  await knex('rentals').insert([
    {
      vehicle_id: camry,
      customer_name: 'John Doe',
      customer_phone: '+15551234001',
      start_date: '2026-07-28',
      end_date: '2026-08-03',
      total_amount: 315.0,
      status: 'completed',
    },
    {
      vehicle_id: camry,
      customer_name: 'Laila Rahman',
      customer_phone: '+8801711223344',
      start_date: '2026-06-01',
      end_date: '2026-06-03',
      total_amount: 135.0,
      status: 'completed',
    },
    {
      vehicle_id: camry,
      customer_name: 'Robert Chen',
      customer_phone: '+15551234003',
      start_date: '2026-08-25',
      end_date: '2026-08-27',
      total_amount: 135.0,
      status: 'booked',
    },
    {
      vehicle_id: camry,
      customer_name: 'Arif Khan',
      customer_phone: '+8801555000111',
      start_date: '2026-08-10',
      end_date: '2026-08-11',
      total_amount: 90.0,
      status: 'cancelled',
    },
    {
      vehicle_id: crv,
      customer_name: 'Jane Smith',
      customer_phone: '+15551234002',
      start_date: '2026-08-18',
      end_date: '2026-08-22',
      total_amount: 325.0,
      status: 'ongoing',
    },
    {
      vehicle_id: crv,
      customer_name: 'Imran Hossain',
      customer_phone: '+8801912003300',
      start_date: '2026-07-05',
      end_date: '2026-07-07',
      total_amount: 195.0,
      status: 'completed',
    },
    {
      vehicle_id: crv,
      customer_name: 'Nadia Akter',
      customer_phone: '+8801611778899',
      start_date: '2026-09-01',
      end_date: '2026-09-03',
      total_amount: 195.0,
      status: 'booked',
    },
    {
      vehicle_id: sunny,
      customer_name: 'Farhan Ahmed',
      customer_phone: '+8801711002200',
      start_date: '2026-09-01',
      end_date: '2026-09-04',
      total_amount: 152.0,
      status: 'booked',
    },
    {
      vehicle_id: sunny,
      customer_name: 'Nabila Chowdhury',
      customer_phone: '+8801912334455',
      start_date: '2026-07-10',
      end_date: '2026-07-12',
      total_amount: 114.0,
      status: 'completed',
    },
    {
      vehicle_id: yamaha,
      customer_name: 'Tahmid Hasan',
      customer_phone: '+8801555667788',
      start_date: '2026-08-08',
      end_date: '2026-08-09',
      total_amount: 45.0,
      status: 'completed',
    },
    {
      vehicle_id: yamaha,
      customer_name: 'Rafiul Islam',
      customer_phone: '+8801811223344',
      start_date: '2026-09-20',
      end_date: '2026-09-21',
      total_amount: 45.0,
      status: 'booked',
    },
    {
      vehicle_id: hiace,
      customer_name: 'Bengal Tours Ltd',
      customer_phone: '+8801700112233',
      start_date: '2026-08-01',
      end_date: '2026-08-05',
      total_amount: 450.0,
      status: 'completed',
    },
    {
      vehicle_id: hiace,
      customer_name: 'Summit Logistics',
      customer_phone: '+8801966007788',
      start_date: '2026-09-15',
      end_date: '2026-09-18',
      total_amount: 360.0,
      status: 'booked',
    },
  ]);
}
