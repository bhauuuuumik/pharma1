import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { IsArray, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { SalesService } from './sales.service';

class SaleItemDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsInt()
  qty!: number;

  @IsNumber()
  unitPrice!: number;

  @IsNumber()
  amount!: number;
}

class CreateSaleDto {
  @IsString()
  deviceId!: string;
  @IsString()
  seriesPrefix!: string;
  @IsInt()
  invoiceNo!: number;
  @IsString()
  fy!: string;
  @IsNumber()
  totalAmount!: number;
  @IsString()
  paymentMode!: string;
  @IsString()
  idempotencyKey!: string;
  @IsArray()
  items!: SaleItemDto[];
}

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  list(@Headers('x-store-id') storeId: string) {
    return this.salesService.list(storeId);
  }

  @Post()
  create(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-store-id') storeId: string,
    @Headers('x-actor-id') actorId: string,
    @Body() body: CreateSaleDto,
  ) {
    return this.salesService.create({ ...body, tenantId, storeId, actorId });
  }

  @Post(':id/void')
  voidSale(@Headers('x-store-id') storeId: string, @Param('id') id: string, @Body('reasonCode') reasonCode: string) {
    return this.salesService.voidSale(storeId, id, reasonCode);
  }

  @Post(':id/returns')
  createReturn(@Headers('x-store-id') storeId: string, @Param('id') id: string, @Body('items') items: { productId: string; batchId?: string; qty: number }[]) {
    return this.salesService.createReturn(storeId, id, items);
  }
}
