import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'pauljimmyab@gmail.com';
  const newPassword = '123456'; // Cambia esto si quieres otra contraseña

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const user = await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });

  console.log(`✅ Contraseña actualizada para: ${user.email}`);
  console.log(`🔑 Nueva contraseña: ${newPassword}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });