import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma/prisma.service';
import { ProductModule } from './product/product.module';
import { SalesModule } from './sales/sales.module';
import { StockModule } from './stock/stock.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [AuthModule, ProductModule, StockModule, SalesModule, SyncModule],
  providers: [PrismaService],
})
export class AppModule {}
