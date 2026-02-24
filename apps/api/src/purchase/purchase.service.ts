import { Injectable } from '@nestjs/common';
import { LedgerEntryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type PurchaseItem = {
  productId: string;
  batchNo: string;
  expiryDate: string;
  qty: number;
  unitCost: number;
};

@Injectable()
export class PurchaseService {
  constructor(private prisma: PrismaService) {}

  list(storeId: string) {
    return this.prisma.purchaseInvoice.findMany({
      where: { storeId },
      include: { supplier: true, lineItems: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  create(input: {
    tenantId: string;
    storeId: string;
    actorId: string;
    supplierId: string;
    invoiceNo: string;
    invoiceDate: string;
    idempotencyKey: string;
    items: PurchaseItem[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      const totalAmount = input.items.reduce((sum, i) => sum + i.qty * i.unitCost, 0);

      const purchase = await tx.purchaseInvoice.create({
        data: {
          tenantId: input.tenantId,
          storeId: input.storeId,
          supplierId: input.supplierId,
          invoiceNo: input.invoiceNo,
          invoiceDate: new Date(input.invoiceDate),
          totalAmount,
          idempotencyKey: input.idempotencyKey,
        },
      });

      for (const item of input.items) {
        const batch = await tx.batch.upsert({
          where: { id: `${input.storeId}-${item.productId}-${item.batchNo}` },
          update: {
            quantity: { increment: item.qty },
            expiryDate: new Date(item.expiryDate),
          },
          create: {
            id: `${input.storeId}-${item.productId}-${item.batchNo}`,
            storeId: input.storeId,
            productId: item.productId,
            batchNo: item.batchNo,
            expiryDate: new Date(item.expiryDate),
            quantity: item.qty,
          },
        });

        await tx.purchaseLineItem.create({
          data: {
            purchaseId: purchase.id,
            productId: item.productId,
            batchId: batch.id,
            qty: item.qty,
            unitCost: item.unitCost,
            amount: item.qty * item.unitCost,
          },
        });

        await tx.stockLedger.create({
          data: {
            tenantId: input.tenantId,
            storeId: input.storeId,
            productId: item.productId,
            batchId: batch.id,
            entryType: LedgerEntryType.PURCHASE,
            quantity: item.qty,
            refType: 'PURCHASE',
            refId: purchase.id,
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          tenantId: input.tenantId,
          storeId: input.storeId,
          actorId: input.actorId,
          action: 'PURCHASE_POSTED',
          entityType: 'PurchaseInvoice',
          entityId: purchase.id,
        },
      });

      return tx.purchaseInvoice.findUniqueOrThrow({
        where: { id: purchase.id },
        include: { lineItems: true, supplier: true },
      });
    });
  }
}
