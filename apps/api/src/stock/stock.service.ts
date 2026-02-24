import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async lookup(storeId: string, query?: string) {
    const products = await this.prisma.product.findMany({
      where: {
        storeId,
        canonicalName: query ? { contains: query, mode: 'insensitive' } : undefined,
      },
      include: {
        batches: {
          where: { quantity: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
        },
      },
      take: 30,
    });

    return products.map((p) => ({
      ...p,
      availableQty: p.batches.reduce((sum, b) => sum + b.quantity, 0),
      fefoBatch: p.batches[0] ?? null,
    }));
  }
}
