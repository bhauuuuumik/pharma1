import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma/prisma.service';
import { ProductModule } from './product/product.module';
import { SalesModule } from './sales/sales.module';
import { StockModule } from './stock/stock.module';
import { SyncModule } from './sync/sync.module';
import { SupplierModule } from './supplier/supplier.module';
import { PurchaseModule } from './purchase/purchase.module';
import { ScanModule } from './scan/scan.module';

@Module({
  imports: [AuthModule, ProductModule, StockModule, SalesModule, SyncModule, SupplierModule, PurchaseModule, ScanModule],
  providers: [PrismaService],
})
export class AppModule {}
