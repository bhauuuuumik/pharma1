import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupplierService {
  constructor(private prisma: PrismaService) {}

  list(tenantId: string, storeId: string) {
    return this.prisma.supplier.findMany({
      where: { tenantId, storeId },
      orderBy: { name: 'asc' },
      take: 100,
    });
  }

  create(data: { tenantId: string; storeId: string; name: string; phone?: string; gstin?: string }) {
    return this.prisma.supplier.create({ data });
  }
}
