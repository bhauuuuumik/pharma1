import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { SupplierService } from './supplier.service';

class CreateSupplierDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  gstin?: string;
}

@Controller('suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get()
  list(@Headers('x-tenant-id') tenantId: string, @Headers('x-store-id') storeId: string) {
    return this.supplierService.list(tenantId, storeId);
  }

  @Post()
  create(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-store-id') storeId: string,
    @Body() body: CreateSupplierDto,
  ) {
    return this.supplierService.create({ tenantId, storeId, ...body });
  }
}
