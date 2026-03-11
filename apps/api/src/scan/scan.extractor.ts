import { z } from 'zod';

export const ExtractedLineSchema = z.object({
  productName: z.string().min(1),
  batchNo: z.string().optional(),
  expiryDate: z.string().optional(),
  qty: z.number().int().positive(),
  unitCost: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
});

export const ExtractedDocSchema = z.object({
  supplierHint: z.string().optional(),
  invoiceNo: z.string().optional(),
  invoiceDate: z.string().optional(),
  lines: z.array(ExtractedLineSchema),
});

export type ExtractedDoc = z.infer<typeof ExtractedDocSchema>;

export class ScanExtractor {
  static parseWithHeuristics(text: string): ExtractedDoc {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // Format: NAME|BATCH|EXP|QTY|COST
        const parts = line.split('|').map((p) => p.trim());
        if (parts.length >= 5 && !Number.isNaN(Number(parts[3])) && !Number.isNaN(Number(parts[4]))) {
          return {
            productName: parts[0],
            batchNo: parts[1],
            expiryDate: parts[2],
            qty: Number(parts[3]),
            unitCost: Number(parts[4]),
            confidence: 0.93,
          };
        }
        return {
          productName: line,
          qty: 1,
          unitCost: 0,
          confidence: 0.55,
        };
      });

    return ExtractedDocSchema.parse({ lines });
  }

  static async parseWithOpenAI(text: string, apiKey?: string): Promise<ExtractedDoc> {
    if (!apiKey) return this.parseWithHeuristics(text);

    const prompt = `Extract structured purchase line items with confidence 0..1 from OCR text. Return strict JSON with keys: supplierHint, invoiceNo, invoiceDate, lines[]. OCR:\n${text}`;
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: prompt,
        text: {
          format: {
            type: 'json_schema',
            name: 'invoice_extraction',
            schema: {
              type: 'object',
              properties: {
                supplierHint: { type: 'string' },
                invoiceNo: { type: 'string' },
                invoiceDate: { type: 'string' },
                lines: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      productName: { type: 'string' },
                      batchNo: { type: 'string' },
                      expiryDate: { type: 'string' },
                      qty: { type: 'number' },
                      unitCost: { type: 'number' },
                      confidence: { type: 'number' },
                    },
                    required: ['productName', 'qty', 'unitCost', 'confidence'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['lines'],
              additionalProperties: false,
            },
            strict: true,
          },
        },
      }),
    });

    if (!response.ok) return this.parseWithHeuristics(text);
    const data: any = await response.json();
    const raw = data.output_text ? JSON.parse(data.output_text) : {};
    return ExtractedDocSchema.parse(raw);
  }
}
