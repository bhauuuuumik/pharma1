import { BadRequestException, Injectable } from '@nestjs/common';
import { ScanStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseService } from '../purchase/purchase.service';
import { ScanExtractor } from './scan.extractor';

@Injectable()
export class ScanService {
  constructor(
    private prisma: PrismaService,
    private purchaseService: PurchaseService,
  ) {}

  async upload(input: {
    tenantId: string;
    storeId: string;
    filename: string;
    mimeType: string;
    sourceText?: string;
  }) {
    return this.prisma.scanDocument.create({
      data: {
        tenantId: input.tenantId,
        storeId: input.storeId,
        filename: input.filename,
        mimeType: input.mimeType,
        sourceText: input.sourceText,
      },
    });
  }

  async process(scanId: string, apiKey?: string) {
    const scan = await this.prisma.scanDocument.findUnique({ where: { id: scanId } });
    if (!scan) throw new BadRequestException('Scan not found');
    const text = scan.sourceText ?? '';
    const extracted = await ScanExtractor.parseWithOpenAI(text, apiKey);

    await this.prisma.scanLineItem.deleteMany({ where: { scanId } });
    for (const line of extracted.lines) {
      await this.prisma.scanLineItem.create({
        data: {
          scanId,
          productName: line.productName,
          batchNo: line.batchNo,
          expiryDate: line.expiryDate ? new Date(line.expiryDate) : null,
          qty: line.qty,
          unitCost: line.unitCost,
          confidence: line.confidence,
        },
      });
    }

    await this.prisma.scanDocument.update({
      where: { id: scanId },
      data: {
        status: ScanStatus.PROCESSED,
        extractedJson: extracted,
      },
    });

    return this.review(scanId);
  }

  async review(scanId: string) {
    const scan = await this.prisma.scanDocument.findUnique({
      where: { id: scanId },
      include: { lineItems: true },
    });
    if (!scan) throw new BadRequestException('Scan not found');

    return {
      id: scan.id,
      status: scan.status,
      lowConfidenceCount: scan.lineItems.filter((i) => Number(i.confidence) < 0.8).length,
      lines: scan.lineItems.map((i) => ({
        id: i.id,
        productName: i.productName,
        batchNo: i.batchNo,
        expiryDate: i.expiryDate,
        qty: i.qty,
        unitCost: Number(i.unitCost),
        confidence: Number(i.confidence),
        lowConfidence: Number(i.confidence) < 0.8,
      })),
    };
  }

  async confirmAndPost(input: {
    scanId: string;
    tenantId: string;
    storeId: string;
    actorId: string;
    supplierId: string;
    idempotencyKey: string;
  }) {
    const scan = await this.prisma.scanDocument.findUnique({
      where: { id: input.scanId },
      include: { lineItems: true },
    });
    if (!scan || !scan.lineItems.length) {
      throw new BadRequestException('Nothing to post');
    }

    const productMap = await this.prisma.product.findMany({
      where: { storeId: input.storeId },
      select: { id: true, canonicalName: true },
    });

    const purchase = await this.purchaseService.create({
      tenantId: input.tenantId,
      storeId: input.storeId,
      actorId: input.actorId,
      supplierId: input.supplierId,
      invoiceNo: `SCAN-${scan.id.slice(0, 8)}`,
      invoiceDate: new Date().toISOString(),
      idempotencyKey: input.idempotencyKey,
      items: scan.lineItems.map((line) => {
        const product = productMap.find(
          (p) => p.canonicalName.toLowerCase() === line.productName.toLowerCase(),
        );
        if (!product) throw new BadRequestException(`Product not found: ${line.productName}`);
        return {
          productId: product.id,
          batchNo: line.batchNo ?? `SCAN-${line.id.slice(0, 4)}`,
          expiryDate: line.expiryDate?.toISOString() ?? new Date().toISOString(),
          qty: line.qty,
          unitCost: Number(line.unitCost),
        };
      }),
    });

    await this.prisma.scanDocument.update({ where: { id: input.scanId }, data: { status: ScanStatus.POSTED } });
    return purchase;
  }
}
