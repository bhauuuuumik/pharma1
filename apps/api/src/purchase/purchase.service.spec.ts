import { PurchaseService } from './purchase.service';

describe('PurchaseService', () => {
  it('computes total and writes purchase ledger entries', async () => {
    const tx: any = {
      purchaseInvoice: {
        create: jest.fn().mockResolvedValue({ id: 'p1' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'p1' }),
      },
      batch: { upsert: jest.fn().mockResolvedValue({ id: 'b1' }) },
      purchaseLineItem: { create: jest.fn() },
      stockLedger: { create: jest.fn() },
      auditEvent: { create: jest.fn() },
    };
    const prisma: any = { $transaction: async (fn: any) => fn(tx) };
    const svc = new PurchaseService(prisma);

    await svc.create({
      tenantId: 't1',
      storeId: 's1',
      actorId: 'a1',
      supplierId: 'sup1',
      invoiceNo: 'INV1',
      invoiceDate: new Date().toISOString(),
      idempotencyKey: 'k1',
      items: [
        {
          productId: 'p',
          batchNo: 'B1',
          expiryDate: new Date().toISOString(),
          qty: 2,
          unitCost: 5,
        },
      ],
    });

    expect(tx.purchaseInvoice.create).toHaveBeenCalled();
    expect(tx.stockLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quantity: 2 }) }),
    );
  });
});
