import { Injectable } from '@nestjs/common';
import { LedgerEntryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  list(storeId: string) {
    return this.prisma.saleInvoice.findMany({ where: { storeId }, include: { lineItems: true }, take: 50, orderBy: { createdAt: 'desc' } });
  }

  async create(input: any) {
    return this.prisma.$transaction(async (tx) => {
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
            create: input.items.map((item: any) => ({
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

      for (const item of input.items) {
        if (item.batchId) {
          await tx.batch.update({ where: { id: item.batchId }, data: { quantity: { decrement: item.qty } } });
        }
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

  async createReturn(storeId: string, saleId: string, items: { productId: string; batchId?: string; qty: number }[]) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.saleInvoice.findFirstOrThrow({ where: { id: saleId, storeId } });
      for (const item of items) {
        if (item.batchId) {
          await tx.batch.update({ where: { id: item.batchId }, data: { quantity: { increment: item.qty } } });
        }
        await tx.stockLedger.create({
          data: {
            tenantId: sale.tenantId,
            storeId,
            productId: item.productId,
            batchId: item.batchId,
            entryType: LedgerEntryType.RETURN,
            quantity: item.qty,
            refType: "SALE_RETURN",
            refId: saleId,
          },
        });
      }
      return { ok: true };
    });
  }

  async voidSale(storeId: string, saleId: string, reasonCode: string) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.saleInvoice.update({ where: { id: saleId, storeId }, data: { status: 'VOID' }, include: { lineItems: true } as any });
      await tx.auditEvent.create({ data: { tenantId: sale.tenantId, storeId, action: 'SALE_VOIDED', entityType: 'SaleInvoice', entityId: saleId, reasonCode } });
      return sale;
    });
  }
}
