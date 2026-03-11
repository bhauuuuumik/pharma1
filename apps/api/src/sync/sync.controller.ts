import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  push(@Body('events') events: any[]) {
    return this.syncService.push(events ?? []);
  }

  @Get('pull')
  pull(@Headers('x-store-id') storeId: string, @Query('cursor') cursor?: string) {
    return this.syncService.pull(storeId, cursor);
  }
}
