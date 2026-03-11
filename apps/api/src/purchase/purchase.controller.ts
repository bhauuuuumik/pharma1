import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsInt, IsNumber, IsString, ValidateNested } from 'class-validator';
import { PurchaseService } from './purchase.service';

class PurchaseItemDto {
  @IsString()
  productId!: string;

  @IsString()
  batchNo!: string;

  @IsDateString()
  expiryDate!: string;

  @IsInt()
  qty!: number;

  @IsNumber()
  unitCost!: number;
}

class CreatePurchaseDto {
  @IsString()
  supplierId!: string;

  @IsString()
  invoiceNo!: string;

  @IsDateString()
  invoiceDate!: string;

  @IsString()
  idempotencyKey!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items!: PurchaseItemDto[];
}

@Controller('purchases')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Get()
  list(@Headers('x-store-id') storeId: string) {
    return this.purchaseService.list(storeId);
  }

  @Post()
  create(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-store-id') storeId: string,
    @Headers('x-actor-id') actorId: string,
    @Body() body: CreatePurchaseDto,
  ) {
    return this.purchaseService.create({ ...body, tenantId, storeId, actorId });
  }
}
