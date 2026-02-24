export type SyncEventType =
  | 'SALE_CREATED'
  | 'SALE_VOIDED'
  | 'PURCHASE_POSTED'
  | 'RETURN_CREATED'
  | 'STOCK_ADJUSTED'
  | 'PRODUCT_UPSERTED'
  | 'CUSTOMER_UPSERTED'
  | 'CONSENT_UPDATED';

export interface SyncEvent<T = Record<string, unknown>> {
  eventId: string;
  tenantId: string;
  storeId: string;
  deviceId: string;
  ts: string;
  type: SyncEventType;
  payload: T;
  idempotencyKey: string;
}
