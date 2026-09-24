import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@pos.com';
  const password = '123456';
  const nombre = 'Administrador';

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    console.log('⚠️  Usuario ya existe:', email);
    return;
  }

  const business = await prisma.business.create({
    data: {
      ruc: '20512345678',
      razonSocial: 'Mi Negocio SAC',
      nombreComercial: 'Mi Negocio',
      direccion: 'Av. Principal 123, Lima',
      telefono: '999888777',
      email: 'contacto@minegocio.com',
      igv: 18,
      giroComercial: 'Comercio',
    },
  });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      nombre,
      rol: 'Admin',
      businessId: business.id,
    },
  });

  await prisma.series.createMany({
    data: [
      { tipo: 'BOLETA', prefijo: 'B001', businessId: business.id },
      { tipo: 'FACTURA', prefijo: 'F001', businessId: business.id },
      { tipo: 'COTIZACION', prefijo: 'CT01', businessId: business.id },
      { tipo: 'NOTA_VENTA', prefijo: 'NV01', businessId: business.id },
      { tipo: 'GUIA', prefijo: 'T001', businessId: business.id },
    ],
  });

  console.log('✅ Seed completado:');
  console.log('   Email:', email);
  console.log('   Contraseña:', password);
  console.log('   Negocio:', business.razonSocial);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
