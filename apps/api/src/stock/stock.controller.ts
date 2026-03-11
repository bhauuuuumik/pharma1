import { Controller, Get, Headers, Query } from '@nestjs/common';
import { StockService } from './stock.service';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('lookup')
  lookup(@Headers('x-store-id') storeId: string, @Query('q') q?: string) {
    return this.stockService.lookup(storeId, q);
  }
}
