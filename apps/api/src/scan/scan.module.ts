import { Module } from '@nestjs/common';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseService } from '../purchase/purchase.service';

@Module({
  controllers: [ScanController],
  providers: [ScanService, PrismaService, PurchaseService],
})
export class ScanModule {}
