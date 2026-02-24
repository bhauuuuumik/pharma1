import { BadRequestException, Injectable } from '@nestjs/common';
import { LedgerEntryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type SaleItemInput = {
  productId: string;
  batchId?: string;
  qty: number;
  unitPrice: number;
  amount: number;
};

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  list(storeId: string) {
    return this.prisma.saleInvoice.findMany({
      where: { storeId },
      include: { lineItems: true },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
  }

  private async resolveBatchId(tx: any, storeId: string, item: SaleItemInput) {
    if (item.batchId) {
      const batch = await tx.batch.findUnique({ where: { id: item.batchId } });
      if (!batch || batch.quantity < item.qty) {
        throw new BadRequestException('Insufficient stock for selected batch');
      }
      return batch.id;
    }

    const fefo = await tx.batch.findFirst({
      where: { storeId, productId: item.productId, quantity: { gte: item.qty } },
      orderBy: { expiryDate: 'asc' },
    });

    if (!fefo) {
      throw new BadRequestException(`Insufficient stock for product ${item.productId}`);
    }

    return fefo.id;
  }

  async create(input: any) {
    return this.prisma.$transaction(async (tx) => {
      const itemsWithBatch: SaleItemInput[] = [];
      for (const item of input.items as SaleItemInput[]) {
        const batchId = await this.resolveBatchId(tx, input.storeId, item);
        itemsWithBatch.push({ ...item, batchId });
      }

      const sale = await tx.saleInvoice.create({
        data: {
          tenantId: input.tenantId,
          storeId: input.storeId,
          deviceId: input.deviceId,
          seriesPrefix: input.seriesPrefix,
          invoiceNo: input.invoiceNo,
          fy: input.fy,
          totalAmount: input.totalAmount,
          paymentMode: input.paymentMode,
          idempotencyKey: input.idempotencyKey,
          lineItems: {
            create: itemsWithBatch.map((item) => ({
              productId: item.productId,
              batchId: item.batchId,
              qty: item.qty,
              unitPrice: item.unitPrice,
              amount: item.amount,
            })),
          },
        },
        include: { lineItems: true },
      });

      for (const item of itemsWithBatch) {
        await tx.batch.update({
          where: { id: item.batchId },
          data: { quantity: { decrement: item.qty } },
        });

        await tx.stockLedger.create({
          data: {
            tenantId: input.tenantId,
            storeId: input.storeId,
            productId: item.productId,
            batchId: item.batchId,
            entryType: LedgerEntryType.SALE,
            quantity: -item.qty,
            refType: 'SALE',
            refId: sale.id,
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          tenantId: input.tenantId,
          storeId: input.storeId,
          actorId: input.actorId,
          action: 'SALE_CREATED',
          entityType: 'SaleInvoice',
          entityId: sale.id,
        },
      });

      return sale;
    });
  }

  async createReturn(
    storeId: string,
    saleId: string,
    items: { productId: string; batchId?: string; qty: number }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.saleInvoice.findFirstOrThrow({
        where: { id: saleId, storeId },
        include: { lineItems: true },
      });

      for (const item of items) {
        const soldLine = sale.lineItems.find((line) => line.productId === item.productId);
        if (!soldLine) {
          throw new BadRequestException('Return item not found in sale');
        }
        const returnBatchId = item.batchId ?? soldLine.batchId ?? undefined;
        if (!returnBatchId) {
          throw new BadRequestException('Missing batch for return');
        }

        await tx.batch.update({
          where: { id: returnBatchId },
          data: { quantity: { increment: item.qty } },
        });
        await tx.stockLedger.create({
          data: {
            tenantId: sale.tenantId,
            storeId,
            productId: item.productId,
            batchId: returnBatchId,
            entryType: LedgerEntryType.RETURN,
            quantity: item.qty,
            refType: 'SALE_RETURN',
            refId: saleId,
          },
        });
      }
      return { ok: true };
    });
  }

  async voidSale(storeId: string, saleId: string, reasonCode: string) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.saleInvoice.update({
        where: { id: saleId, storeId } as any,
        data: { status: 'VOID' },
        include: { lineItems: true } as any,
      });
      await tx.auditEvent.create({
        data: {
          tenantId: sale.tenantId,
          storeId,
          action: 'SALE_VOIDED',
          entityType: 'SaleInvoice',
          entityId: saleId,
          reasonCode,
        },
      });
      return sale;
    });
  }
}
