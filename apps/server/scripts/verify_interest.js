const loginUrl = 'http://localhost:5001/api/auth/login';
const customersUrl = 'http://localhost:5001/api/customers?limit=1';
const loansUrl = 'http://localhost:5001/api/loans';

async function run() {
  try {
    let token;

    // 1. Try Registering New User
    console.log('Registering new user...');
    const email = `admin${Date.now()}@loanmanagement.com`;
    const password = 'Password@123';

    const registerRes = await fetch('http://localhost:5001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Admin',
        email,
        password,
        businessName: 'Test Biz',
      }),
    });

    if (registerRes.ok) {
      const data = await registerRes.json();
      token = data.token;
      console.log('Registered successfully.');
    } else {
      const errText = await registerRes.text();
      console.log('Registration failed:', registerRes.status, errText);

      console.log('Trying seed login...');
      const loginRes = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@loanmanagement.com',
          password: 'SuperAdmin@123',
        }),
      });

      if (!loginRes.ok) {
        throw new Error(
          `Login also failed: ${loginRes.status} ${await loginRes.text()}`,
        );
      }
      const data = await loginRes.json();
      token = data.token;
      console.log('Logged in successfully with seed creds.');
    }

    // 2. Get Customer
    console.log('Fetching customers...');
    const customersRes = await fetch(customersUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!customersRes.ok) {
      throw new Error(
        `Failed to fetch customers: ${customersRes.status} ${await customersRes.text()}`,
      );
    }

    const customersData = await customersRes.json();
    let customerId;

    if (customersData.data && customersData.data.length > 0) {
      customerId = customersData.data[0]._id;
    } else {
      console.log('Creating customer...');
      const createCustRes = await fetch('http://localhost:5001/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: 'Test Customer',
          email: `test${Date.now()}@example.com`,
          phone: '1234567890',
          address: 'Test Address',
        }),
      });

      if (!createCustRes.ok) {
        throw new Error(
          `Failed to create customer: ${await createCustRes.text()}`,
        );
      }
      const custData = await createCustRes.json();
      customerId = custData._id;
    }
    console.log('Using Customer ID:', customerId);

    // 3. Create Simple Interest Loan
    console.log('Creating Simple Interest Loan...');
    const simpleLoanRes = await fetch(loansUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        customerId,
        principal: 10000,
        rate: 10,
        duration: 12,
        startDate: new Date().toISOString(),
        interestType: 'simple',
      }),
    });

    if (!simpleLoanRes.ok) {
      throw new Error(
        `Simple Loan creation failed: ${await simpleLoanRes.text()}`,
      );
    }

    const simpleLoan = await simpleLoanRes.json();
    console.log('Simple Loan ID:', simpleLoan._id);
    console.log('Simple Total Amount:', simpleLoan.totalAmount);
    console.log('Simple EMI:', simpleLoan.emi);

    // Verify Simple Interest: Total = 10000 + (10000 * 0.1 * 1) = 11000
    if (Math.abs(simpleLoan.totalAmount - 11000) < 1) {
      console.log('✅ Simple Interest Calculation Correct');
    } else {
      console.error('❌ Simple Interest Calculation Incorrect. Expected 11000');
    }

    // 4. Create EMI Loan
    console.log('Creating EMI Loan...');
    const emiLoanRes = await fetch(loansUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        customerId,
        principal: 10000,
        rate: 10,
        duration: 12,
        startDate: new Date().toISOString(),
        interestType: 'emi',
      }),
    });

    if (!emiLoanRes.ok) {
      throw new Error(`EMI Loan creation failed: ${await emiLoanRes.text()}`);
    }

    const emiLoan = await emiLoanRes.json();
    console.log('EMI Loan ID:', emiLoan._id);
    console.log('EMI Total Amount:', emiLoan.totalAmount);

    // Verify EMI: Approx 10549.91
    if (Math.abs(emiLoan.totalAmount - 10549) < 10) {
      // Loose check
      console.log('✅ EMI Calculation Correct (Approx)');
    } else {
      console.error('❌ EMI Calculation Incorrect. Expected ~10549');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
