const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' }); // Fixed path

async function test() {
  const testEmail = 'test' + Date.now() + '@example.com';
  try {
    console.log('Registering test user...');
    const regRes = await fetch('http://localhost:5001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Setup',
        email: testEmail,
        password: 'Password123!',
        passwordConfirm: 'Password123!',
      }),
    });
    console.log('Registration Status:', regRes.status);

    console.log('Connecting to DB to verify user...');
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.useDb('loan-management');

    await db
      .collection('users')
      .updateOne({ email: testEmail }, { $set: { isVerified: true } });
    console.log('User verified!');

    console.log('\nLogging in...');
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!',
      }),
    });

    console.log('Login Status:', loginRes.status);
    console.log(
      'Login Response Headers:',
      Object.fromEntries(loginRes.headers.entries()),
    );
    const loginData = await loginRes.json();
    console.log('Has Set-Cookie?', loginRes.headers.has('set-cookie'));
    if (loginRes.headers.has('set-cookie')) {
      console.log('Cookie String:', loginRes.headers.get('set-cookie'));
    }
  } catch (err) {
    console.log('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}
test();
