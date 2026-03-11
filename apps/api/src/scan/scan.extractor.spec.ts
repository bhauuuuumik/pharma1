import { ScanExtractor } from './scan.extractor';

describe('ScanExtractor', () => {
  it('parses pipe-delimited OCR text with high confidence', () => {
    const out = ScanExtractor.parseWithHeuristics('Medicine 1|B10|2027-03-31|2|12.5');
    expect(out.lines).toHaveLength(1);
    expect(out.lines[0].productName).toBe('Medicine 1');
    expect(out.lines[0].confidence).toBeGreaterThan(0.8);
  });

  it('marks unstructured lines as low confidence', () => {
    const out = ScanExtractor.parseWithHeuristics('blurred text line');
    expect(out.lines[0].confidence).toBeLessThan(0.8);
  });
});
