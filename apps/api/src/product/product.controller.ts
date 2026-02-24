import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ProductService } from './product.service';

class CreateProductDto {
  @IsString()
  canonicalName!: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsNumber()
  mrp!: number;

  @IsNumber()
  gstRate!: number;
}

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  list(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-store-id') storeId: string,
    @Query('q') q?: string,
  ) {
    return this.productService.list(tenantId, storeId, q);
  }

  @Post()
  create(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-store-id') storeId: string,
    @Body() body: CreateProductDto,
  ) {
    return this.productService.create({ tenantId, storeId, ...body });
  }
}
