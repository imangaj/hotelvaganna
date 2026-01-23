import { prisma } from '../src/db';
import readline from 'readline';
import bcrypt from 'bcryptjs';

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter guest email to reset password: ', async (email) => {
    rl.question('Enter new password: ', async (newPassword) => {
      try {
        const hashed = await bcrypt.hash(newPassword, 10);
        const updated = await prisma.guest.updateMany({
          where: { email },
          data: { password: hashed },
        });
        if (updated.count > 0) {
          console.log(`Password reset for ${updated.count} guest(s) with email ${email}.`);
        } else {
          console.log('No guest found with that email.');
        }
      } catch (err) {
        console.error('Error resetting password:', err);
      } finally {
        rl.close();
        await prisma.$disconnect();
      }
    });
  });
}

main();
