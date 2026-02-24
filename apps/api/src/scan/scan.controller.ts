import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { ScanService } from './scan.service';

class UploadScanDto {
  @IsString()
  filename!: string;

  @IsString()
  mimeType!: string;

  @IsOptional()
  @IsString()
  sourceText?: string;
}

class ConfirmScanDto {
  @IsString()
  supplierId!: string;

  @IsString()
  idempotencyKey!: string;
}

@Controller('scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post('upload')
  upload(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-store-id') storeId: string,
    @Body() body: UploadScanDto,
  ) {
    return this.scanService.upload({ tenantId, storeId, ...body });
  }

  @Post(':id/process')
  process(@Param('id') id: string) {
    return this.scanService.process(id, process.env.OPENAI_API_KEY);
  }

  @Get(':id/review')
  review(@Param('id') id: string) {
    return this.scanService.review(id);
  }

  @Post(':id/confirm')
  confirm(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-store-id') storeId: string,
    @Headers('x-actor-id') actorId: string,
    @Body() body: ConfirmScanDto,
  ) {
    return this.scanService.confirmAndPost({
      scanId: id,
      tenantId,
      storeId,
      actorId,
      supplierId: body.supplierId,
      idempotencyKey: body.idempotencyKey,
    });
  }
}
