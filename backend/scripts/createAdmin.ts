import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@pms.com';
  const password = 'password123'; // Simple default password
  const name = 'System Admin';

  console.log(`Creating admin user: ${email}...`);

  const hashedPassword = await bcryptjs.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
        password: hashedPassword, // Ensure password is set to known value
        role: 'ADMIN' 
    },
    create: {
      email,
      name,
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log(`Admin user created/updated successfully.`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
