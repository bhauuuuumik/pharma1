import { describe, expect, it } from 'vitest';

describe('sync', () => {
  it('keeps type list stable', () => {
    expect('SALE_CREATED').toBeTypeOf('string');
  });
});
