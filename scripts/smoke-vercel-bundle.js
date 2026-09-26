const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

// Runs only the built function in a temporary directory, with a disposable DB
// and an explicit environment so no local integration credentials are loaded.
async function probe() {
  const assert = require('node:assert/strict');
  const { once } = require('node:events');
  const { createRequire } = require('node:module');
  const path = require('node:path');
  const serverRequire = createRequire(path.resolve('apps/server/src/index.js'));
  const mongoose = serverRequire('mongoose');
  const cron = serverRequire('node-cron');
  const app = require('./api/index');
  assert.equal(cron.getTasks().size, 0);
  assert.equal(mongoose.connection.readyState, 0);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const stripe = serverRequire('stripe')(process.env.STRIPE_SECRET_KEY);
    const body = JSON.stringify({ id: 'evt_bundle_smoke', type: 'invoice.created', data: { object: {} } });
    const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret: process.env.STRIPE_WEBHOOK_SECRET });
    const webhook = await fetch(`${origin}/api/webhook`, {
      method: 'POST', body,
      headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signature },
    });
    assert.equal(webhook.status, 200, 'Signed Stripe webhook must connect on a cold start');
    assert.equal(mongoose.connection.readyState, 1);
    const response = await fetch(`${origin}/api/health`);
    const health = await response.json();
    assert.equal(response.status, 200);
    assert.equal(health.db, 1);
    assert.equal(health.jobs.registered, 16);
    assert.equal(health.jobs.enabled, false);
    assert.equal((await fetch(`${origin}/api/realtime`)).status, 401);
    assert.equal((await fetch(`${origin}/api/cron/overdue`)).status, 401);
    serverRequire('tesseract.js');
    serverRequire('pdf-parse');
    const getCore = serverRequire('tesseract.js/src/worker-script/node/getCore');
    const loadCore = await getCore(1, null, { progress() {} });
    await loadCore();
    console.log('Isolated Vercel bundle passed: cold webhook, health, auth, cron gating and OCR WASM runtime.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
}

async function main() {
  const output = path.resolve(process.argv[2] || '.vercel/output');
  const bundle = path.join(output, 'functions/api/index.func');
  assert.ok(fs.existsSync(bundle), 'Run vercel build --prod --standalone first');
  const files = fs.readdirSync(bundle, { recursive: true });
  assert.deepEqual(files.filter((file) => /(^|\/)\.env(?:$|\.)|\.(?:pem|key|p12|pfx|jks|keystore)$/.test(file)), [], 'Secret files must not be bundled');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'finflo-bundle-smoke-'));
  let replica;
  try {
    fs.cpSync(bundle, directory, { recursive: true, dereference: true });
    replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const child = spawn(process.execPath, ['-e', `(${probe.toString()})().catch((error) => { console.error(error); process.exit(1); });`], {
      cwd: directory, stdio: 'inherit', timeout: 60000,
      env: {
        PATH: process.env.PATH, HOME: process.env.HOME,
        NODE_ENV: 'test', VERCEL: '1', VERCEL_ENV: 'production', VERCEL_CRON_ENABLED: 'false',
        JWT_SECRET: crypto.randomBytes(32).toString('hex'), MONGO_URI: replica.getUri(),
        STRIPE_SECRET_KEY: 'sk_test_dummy', STRIPE_WEBHOOK_SECRET: 'whsec_bundle_test',
      },
    });
    const code = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', resolve);
    });
    assert.equal(code, 0, 'Isolated API smoke test failed');
  } finally {
    if (replica) await replica.stop();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
