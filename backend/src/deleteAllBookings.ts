import { prisma } from '../src/db';

async function main() {
  try {
    const deleted = await prisma.booking.deleteMany({});
    console.log(`Deleted ${deleted.count} bookings.`);
  } catch (err) {
    console.error('Error deleting bookings:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
