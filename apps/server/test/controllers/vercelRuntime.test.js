const { once } = require('events');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const { makeOwner } = require('../helpers/factories');
const { getIO, setIO } = require('../../src/utils/socketInstance');

describe('Vercel API runtime', () => {
  let server;
  let origin;
  let saved;
  let previousIO;
  beforeAll(async () => {
    saved = { VERCEL: process.env.VERCEL, VERCEL_URL: process.env.VERCEL_URL, MONGO_URI: process.env.MONGO_URI, VERCEL_CRON_ENABLED: process.env.VERCEL_CRON_ENABLED };
    previousIO = getIO();
    process.env.VERCEL = '1';
    process.env.VERCEL_URL = 'finflo-test-scope.vercel.app';
    process.env.MONGO_URI = process.env.MONGO_TEST_URI;
    process.env.VERCEL_CRON_ENABLED = 'false';
    const taskCount = cron.getTasks().size;
    const sigtermCount = process.listenerCount('SIGTERM');
    const app = require('../../../../api/index');
    expect(cron.getTasks().size).toBe(taskCount);
    expect(process.listenerCount('SIGTERM')).toBe(sigtermCount);
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    origin = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    setIO(previousIO);
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });

  it('serves health without registering in-process schedules', async () => {
    const response = await fetch(`${origin}/api/health`);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.db).toBe(1);
    expect(body.jobs.enabled).toBe(false);
    expect(body.jobs.registered).toBe(16);
  });

  it('permits the exact deployment origin without allowing unrelated Vercel apps', async () => {
    const allowed = await fetch(`${origin}/api/health`, { headers: { Origin: 'https://finflo-test-scope.vercel.app' } });
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://finflo-test-scope.vercel.app');
    const denied = await fetch(`${origin}/api/health`, { headers: { Origin: 'https://unrelated-app.vercel.app' } });
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
    expect(denied.status).toBeGreaterThanOrEqual(400);
  });

  it('rejects unauthenticated cron and realtime requests', async () => {
    expect((await fetch(`${origin}/api/cron/overdue`)).status).toBe(401);
    expect((await fetch(`${origin}/api/realtime`)).status).toBe(401);
  });

  it('serves polling through the existing response envelope', async () => {
    const owner = await makeOwner();
    const token = jwt.sign({ id: owner.id, type: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const response = await fetch(`${origin}/api/realtime`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.events).toEqual([]);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('rejects non-access tokens on shared endpoints', async () => {
    const owner = await makeOwner();
    const token = jwt.sign({ id: owner.id, type: 'direct-upload' }, process.env.JWT_SECRET);
    const response = await fetch(`${origin}/api/realtime`, { headers: { Authorization: `Bearer ${token}` } });
    expect(response.status).toBe(401);
  });

  it('preserves raw request bytes for Raast signature verification', async () => {
    const crypto = require('crypto');
    const body = JSON.stringify({ status: 'PENDING', order_reference: 'test' }, null, 2);
    const signature = crypto.createHmac('sha256', process.env.RAAST_SECRET_KEY).update(body).digest('hex');
    const response = await fetch(`${origin}/api/webhook/raast`, {
      method: 'POST', body, headers: { 'Content-Type': 'application/json', 'X-Signature': signature },
    });
    expect(response.status).toBe(200);
    expect((await response.json()).message).toBe('Acknowledged non-success status');
  });
});
