import Dexie, { type EntityTable } from 'dexie';

export interface CachedProduct {
  id: string;
  canonicalName: string;
  mrp: number;
}

export interface StockSnapshot {
  productId: string;
  availableQty: number;
  fefoBatchId?: string;
}

export interface OutboxEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

class PharmaDb extends Dexie {
  products!: EntityTable<CachedProduct, 'id'>;
  stock!: EntityTable<StockSnapshot, 'productId'>;
  outbox!: EntityTable<OutboxEvent, 'id'>;
  meta!: EntityTable<{ key: string; value: string }, 'key'>;

  constructor() {
    super('pharma1');
    this.version(1).stores({
      products: 'id, canonicalName',
      stock: 'productId',
      outbox: 'id, type, createdAt',
      meta: 'key',
    });
  }
}

export const db = new PharmaDb();
