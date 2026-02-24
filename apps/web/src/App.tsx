import { useEffect, useMemo, useState } from 'react';
import { db } from './db';

const API = 'http://localhost:3000';
const headers = { 'x-tenant-id': 'tenant-demo', 'x-store-id': 'store-demo', 'x-actor-id': 'staff-demo', 'Content-Type': 'application/json' };

export function App() {
  const [q, setQ] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [pending, setPending] = useState(0);
  const [lastSync, setLastSync] = useState('-');

  useEffect(() => {
    refreshPending();
  }, []);

  async function refreshPending() {
    setPending(await db.outbox.count());
    const m = await db.meta.get('lastSync');
    setLastSync(m?.value ?? '-');
  }

  async function search() {
    if (navigator.onLine) {
      const res = await fetch(`${API}/stock/lookup?q=${encodeURIComponent(q)}`, { headers });
      const data = await res.json();
      setProducts(data);
      await db.products.clear();
      await db.stock.clear();
      for (const item of data) {
        await db.products.put({ id: item.id, canonicalName: item.canonicalName, mrp: Number(item.mrp) });
        await db.stock.put({ productId: item.id, availableQty: item.availableQty, fefoBatchId: item.fefoBatch?.id });
      }
    } else {
      const local = await db.products.where('canonicalName').startsWithIgnoreCase(q).limit(30).toArray();
      setProducts(local);
    }
  }

  const total = useMemo(() => cart.reduce((sum, i) => sum + i.amount, 0), [cart]);

  async function checkout() {
    const payload = {
      deviceId: 'device-A', seriesPrefix: 'A', invoiceNo: Date.now() % 100000, fy: '2025-26', paymentMode: 'CASH',
      totalAmount: total, idempotencyKey: crypto.randomUUID(), items: cart,
    };
    if (navigator.onLine) {
      await fetch(`${API}/sales`, { method: 'POST', headers, body: JSON.stringify(payload) });
      alert('Sale posted online');
    } else {
      await db.outbox.add({ id: crypto.randomUUID(), type: 'SALE_CREATED', payload, createdAt: new Date().toISOString() });
      alert('Saved offline to outbox');
      await refreshPending();
    }
    setCart([]);
  }

  async function syncNow() {
    const events = await db.outbox.toArray();
    if (!events.length) return;
    await fetch(`${API}/sync/push`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ events: events.map((e) => ({ eventId: e.id, tenantId: 'tenant-demo', storeId: 'store-demo', deviceId: 'device-A', ts: e.createdAt, type: e.type, payload: e.payload, idempotencyKey: e.id })) }),
    });
    await db.outbox.clear();
    await db.meta.put({ key: 'lastSync', value: new Date().toISOString() });
    await refreshPending();
  }

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h2>Pharma POS (Phase 1)</h2>
      <div style={{ display: 'flex', gap: 8 }}>
        <input placeholder="Search medicine" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} autoFocus />
        <button onClick={search}>Search</button>
        <button onClick={syncNow}>Sync ({pending})</button>
        <span>Last sync: {lastSync}</span>
      </div>
      <h3>Inventory lookup</h3>
      <ul>
        {products.map((p: any) => (
          <li key={p.id}>
            {p.canonicalName} - ₹{Number(p.mrp).toFixed(2)}
            <button onClick={() => setCart((c) => [...c, { productId: p.id, batchId: p.fefoBatch?.id, qty: 1, unitPrice: Number(p.mrp), amount: Number(p.mrp) }])}>+ Add</button>
          </li>
        ))}
      </ul>
      <h3>Cart (keyboard-first simple)</h3>
      <ul>{cart.map((i, idx) => <li key={idx}>{i.productId} x{i.qty} = ₹{i.amount.toFixed(2)}</li>)}</ul>
      <div>Total: ₹{total.toFixed(2)}</div>
      <button onClick={checkout} disabled={!cart.length}>Take Payment & Print</button>
      <button onClick={() => window.print()} style={{ marginLeft: 8 }}>Print Invoice</button>
    </div>
  );
}
