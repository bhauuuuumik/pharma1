import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  list(tenantId: string, storeId: string, q?: string) {
    return this.prisma.product.findMany({
      where: {
        tenantId,
        storeId,
        canonicalName: q ? { contains: q, mode: 'insensitive' } : undefined,
      },
      take: 50,
      orderBy: { canonicalName: 'asc' },
    });
  }

  create(data: {
    tenantId: string;
    storeId: string;
    canonicalName: string;
    barcode?: string;
    mrp: number;
    gstRate: number;
  }) {
    return this.prisma.product.create({ data });
  }
}
