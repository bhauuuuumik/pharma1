import { useEffect, useMemo, useState } from 'react';
import { db } from './db';

const API = 'http://localhost:3000';
const headers = {
  'x-tenant-id': 'tenant-demo',
  'x-store-id': 'store-demo',
  'x-actor-id': 'staff-demo',
  'Content-Type': 'application/json',
};

type Supplier = { id: string; name: string };

export function App() {
  const [tab, setTab] = useState<'pos' | 'purchase' | 'scan'>('pos');
  const [q, setQ] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [pending, setPending] = useState(0);
  const [lastSync, setLastSync] = useState('-');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [purchaseProductId, setPurchaseProductId] = useState('prod-1');
  const [purchaseBatchNo, setPurchaseBatchNo] = useState('NEWB1');
  const [purchaseQty, setPurchaseQty] = useState(10);
  const [purchaseUnitCost, setPurchaseUnitCost] = useState(12);

  const [scanText, setScanText] = useState('Medicine 1|BA10|2027-03-31|5|11.5');
  const [scanId, setScanId] = useState('');
  const [scanReview, setScanReview] = useState<any>(null);

  useEffect(() => {
    refreshPending();
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    if (!navigator.onLine) return;
    const res = await fetch(`${API}/suppliers`, { headers });
    if (!res.ok) return;
    const data = await res.json();
    setSuppliers(data);
    if (data[0] && !selectedSupplier) setSelectedSupplier(data[0].id);
  }

  async function createSupplier() {
    const res = await fetch(`${API}/suppliers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: supplierName }),
    });
    if (!res.ok) return;
    setSupplierName('');
    await loadSuppliers();
  }

  async function postPurchase() {
    if (!selectedSupplier) {
      alert('Select supplier');
      return;
    }
    const payload = {
      supplierId: selectedSupplier,
      invoiceNo: `PINV-${Date.now()}`,
      invoiceDate: new Date().toISOString(),
      idempotencyKey: crypto.randomUUID(),
      items: [
        {
          productId: purchaseProductId,
          batchNo: purchaseBatchNo,
          expiryDate: new Date(Date.now() + 365 * 86400000).toISOString(),
          qty: purchaseQty,
          unitCost: purchaseUnitCost,
        },
      ],
    };

    const res = await fetch(`${API}/purchases`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      alert('Purchase failed');
      return;
    }
    alert('Purchase posted to stock ledger');
  }


  async function uploadAndProcessScan() {
    const up = await fetch(`${API}/scan/upload`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filename: `scan-${Date.now()}.txt`,
        mimeType: 'text/plain',
        sourceText: scanText,
      }),
    });
    if (!up.ok) return alert('Upload failed');
    const uploaded = await up.json();
    setScanId(uploaded.id);

    const pr = await fetch(`${API}/scan/${uploaded.id}/process`, { method: 'POST', headers });
    if (!pr.ok) return alert('Process failed');

    const rv = await fetch(`${API}/scan/${uploaded.id}/review`, { headers });
    const review = await rv.json();
    setScanReview(review);
  }

  async function confirmScanToPurchase() {
    if (!scanId || !selectedSupplier) return alert('Scan and supplier required');
    const res = await fetch(`${API}/scan/${scanId}/confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ supplierId: selectedSupplier, idempotencyKey: crypto.randomUUID() }),
    });
    if (!res.ok) return alert('Confirm failed');
    alert('Scan confirmed and posted to purchase ledger');
  }

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
      deviceId: 'device-A',
      seriesPrefix: 'A',
      invoiceNo: Date.now() % 100000,
      fy: '2025-26',
      paymentMode: 'CASH',
      totalAmount: total,
      idempotencyKey: crypto.randomUUID(),
      items: cart,
    };
    if (navigator.onLine) {
      const res = await fetch(`${API}/sales`, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (!res.ok) {
        alert('Sale failed');
        return;
      }
      alert('Sale posted online');
    } else {
      await db.outbox.add({
        id: crypto.randomUUID(),
        type: 'SALE_CREATED',
        payload,
        createdAt: new Date().toISOString(),
      });
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
      body: JSON.stringify({
        events: events.map((e) => ({
          eventId: e.id,
          tenantId: 'tenant-demo',
          storeId: 'store-demo',
          deviceId: 'device-A',
          ts: e.createdAt,
          type: e.type,
          payload: e.payload,
          idempotencyKey: e.id,
        })),
      }),
    });
    await db.outbox.clear();
    await db.meta.put({ key: 'lastSync', value: new Date().toISOString() });
    await refreshPending();
  }

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h2>Pharma POS (Phase 3)</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button onClick={() => setTab('pos')}>POS</button>
        <button onClick={() => setTab('purchase')}>Purchase Entry</button>
        <button onClick={() => setTab('scan')}>Invoice Scan Review</button>
      </div>

      {tab === 'pos' ? (
        <>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Search medicine"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              autoFocus
            />
            <button onClick={search}>Search</button>
            <button onClick={syncNow}>Sync ({pending})</button>
            <span>Last sync: {lastSync}</span>
          </div>
          <h3>Inventory lookup</h3>
          <ul>
            {products.map((p: any) => (
              <li key={p.id}>
                {p.canonicalName} - ₹{Number(p.mrp).toFixed(2)}
                <button
                  onClick={() =>
                    setCart((c) => [
                      ...c,
                      {
                        productId: p.id,
                        batchId: p.fefoBatch?.id,
                        qty: 1,
                        unitPrice: Number(p.mrp),
                        amount: Number(p.mrp),
                      },
                    ])
                  }
                >
                  + Add
                </button>
              </li>
            ))}
          </ul>
          <h3>Cart (keyboard-first simple)</h3>
          <ul>
            {cart.map((i, idx) => (
              <li key={idx}>
                {i.productId} x{i.qty} = ₹{i.amount.toFixed(2)}
              </li>
            ))}
          </ul>
          <div>Total: ₹{total.toFixed(2)}</div>
          <button onClick={checkout} disabled={!cart.length}>
            Take Payment & Print
          </button>
          <button onClick={() => window.print()} style={{ marginLeft: 8 }}>
            Print Invoice
          </button>
        </>
      ) : tab === 'purchase' ? (
        <>
          <h3>Manual Purchase Entry</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              placeholder="New supplier name"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />
            <button onClick={createSupplier}>Add Supplier</button>
            <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)}>
              <option value="">Select supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Product ID" value={purchaseProductId} onChange={(e) => setPurchaseProductId(e.target.value)} />
            <input placeholder="Batch" value={purchaseBatchNo} onChange={(e) => setPurchaseBatchNo(e.target.value)} />
            <input type="number" value={purchaseQty} onChange={(e) => setPurchaseQty(Number(e.target.value))} />
            <input type="number" value={purchaseUnitCost} onChange={(e) => setPurchaseUnitCost(Number(e.target.value))} />
            <button onClick={postPurchase}>Post Purchase</button>
          </div>
        </>
      ) : (
        <>
          <h3>Invoice Scan Review (Human-in-loop)</h3>
          <p>Paste OCR text lines in format NAME|BATCH|EXP|QTY|COST, then process and review confidence.</p>
          <textarea value={scanText} onChange={(e) => setScanText(e.target.value)} rows={6} style={{ width: '100%' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={uploadAndProcessScan}>Upload & Process</button>
            <button onClick={confirmScanToPurchase} disabled={!scanReview}>Confirm & Post to Stock</button>
          </div>
          {scanReview && (
            <div style={{ marginTop: 12 }}>
              <div>Low confidence lines: {scanReview.lowConfidenceCount}</div>
              <ul>
                {scanReview.lines.map((line: any) => (
                  <li key={line.id} style={{ background: line.lowConfidence ? '#ffe6e6' : '#eaffea', padding: 6 }}>
                    {line.productName} | {line.batchNo ?? '-'} | qty {line.qty} | cost ₹{line.unitCost} | conf {line.confidence}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

    </div>
  );
}
