import { describe, expect, it } from 'vitest';
import { SELF } from 'cloudflare:test';

describe('API access', () => {
  it('does not expose the destructive seed route', async () => {
    const response = await SELF.fetch('http://example.com/seed');
    expect(response.status).toBe(404);
  });

  it('denies admin data without a session', async () => {
    const response = await SELF.fetch('http://example.com/api/admin/profiles');
    expect(response.status).toBe(403);
  });
});
