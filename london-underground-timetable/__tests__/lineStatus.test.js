const request = require('supertest');
const { app, setCachedLineStatus } = require('../server');

describe('GET /api/line/:lineId/status', () => {
  it('should return cached line status on API error if cache exists', async () => {
    const mockStatus = [{
      id: 'victoria',
      name: 'Victoria',
      lineStatuses: [{ statusSeverityDescription: 'Good Service' }]
    }];

    // Set cache for 'victoria' line but make it "expired" by setting timestamp to 0
    // so it doesn't trigger the early return at line 866.
    setCachedLineStatus('victoria', mockStatus);

    // In the test environment, IS_TEST_ENV is true, so makeApiRequest will fail
    // which triggers the catch block at line 879.
    const res = await request(app).get('/api/line/victoria/status');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockStatus);
  });

  it('should return empty array on API error if cache does not exist', async () => {
    // We don't set the cache for 'piccadilly'
    // So it should hit the final fallback returning []

    const res = await request(app).get('/api/line/piccadilly/status');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
