import { PrismaClient, ScheduleFlag } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: 'tenant-demo' },
    update: {},
    create: { id: 'tenant-demo', name: 'Demo Pharmacy Group' },
  });

  const store = await prisma.store.upsert({
    where: { id: 'store-demo' },
    update: {},
    create: { id: 'store-demo', tenantId: tenant.id, name: 'Main Store', code: 'MAIN' },
  });

  const pinHash = await bcrypt.hash('1234', 10);
  await prisma.staff.upsert({
    where: { id: 'staff-demo' },
    update: {},
    create: {
      id: 'staff-demo',
      tenantId: tenant.id,
      storeId: store.id,
      phone: '9999999999',
      pinHash,
      role: 'OWNER',
      displayName: 'Demo Owner',
    },
  });


  await prisma.supplier.upsert({
    where: { id: 'sup-demo' },
    update: {},
    create: {
      id: 'sup-demo',
      tenantId: tenant.id,
      storeId: store.id,
      name: 'Demo Distributor',
      phone: '9000000000',
      gstin: '29ABCDE1234F1Z5',
    },
  });

  for (let i = 1; i <= 500; i++) {
    const product = await prisma.product.upsert({
      where: { id: `prod-${i}` },
      update: {},
      create: {
        id: `prod-${i}`,
        tenantId: tenant.id,
        storeId: store.id,
        canonicalName: `Medicine ${i}`,
        barcode: `${8900000000000 + i}`,
        scheduleFlag: i % 20 === 0 ? ScheduleFlag.H1 : ScheduleFlag.NONE,
        mrp: 10 + (i % 15),
        gstRate: 12,
      },
    });

    if (i <= 50) {
      await prisma.batch.upsert({
        where: { id: `batch-${i}` },
        update: {},
        create: {
          id: `batch-${i}`,
          storeId: store.id,
          productId: product.id,
          batchNo: `B${i}`,
          expiryDate: new Date(Date.now() + i * 86400000 * 30),
          quantity: 100,
        },
      });
    }
  }
}

main().finally(() => prisma.$disconnect());
