import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}

  async push(events: any[]) {
    let lastCursor: string | null = null;
    for (const event of events) {
      const created = await this.prisma.syncEvent.upsert({
        where: { idempotencyKey: event.idempotencyKey },
        update: {},
        create: {
          eventId: event.eventId,
          tenantId: event.tenantId,
          storeId: event.storeId,
          deviceId: event.deviceId,
          ts: new Date(event.ts),
          type: event.type,
          payload: event.payload,
          idempotencyKey: event.idempotencyKey,
        },
      });
      lastCursor = created.createdAt.toISOString();
    }
    return { appliedCursor: lastCursor };
  }

  async pull(storeId: string, cursor?: string) {
    const since = cursor ? new Date(cursor) : new Date(0);
    const events = await this.prisma.syncEvent.findMany({
      where: { storeId, createdAt: { gt: since } },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });
    return {
      events,
      nextCursor: events.at(-1)?.createdAt.toISOString() ?? cursor ?? null,
    };
  }
}
