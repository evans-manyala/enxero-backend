#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:3001';
const API_PREFIX = '/api/v1';

// Test data
const testUser = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe.test@example.com',
  username: 'johndoe123',
  password: 'TestPassword123!',
  companyName: 'Test Company Ltd',
  country: 'KE' // Kenya
};

// Store test results
let testResults = {
  total: 0,
  passed: 0,
  failed: 0
};

// Helper functions
function logTest(name, passed, message = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}`.green);
    if (message) console.log(`   ${message}`.gray);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}`.red);
    if (message) console.log(`   ${message}`.gray);
  }
}

function logSection(title) {
  console.log(`\n${'='.repeat(60)}`.blue);
  console.log(`${title}`.blue.bold);
  console.log(`${'='.repeat(60)}`.blue);
}

function logSubsection(title) {
  console.log(`\n${'-'.repeat(40)}`.cyan);
  console.log(`${title}`.cyan.bold);
  console.log(`${'-'.repeat(40)}`.cyan);
}

// Test functions
async function testHealthCheck() {
  logSubsection('Health Check');
  try {
    const response = await axios.get(`${BASE_URL}${API_PREFIX}/health`);
    logTest('GET /api/health', response.status === 200, `Status: ${response.status}`);
    return true;
  } catch (error) {
    logTest('GET /api/health', false, `Error: ${error.message}`);
    return false;
  }
}

async function testLegacyAuth() {
  logSubsection('Legacy Authentication');

  try {
    // Test legacy registration
    const registerData = {
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email: testUser.email,
      username: testUser.username,
      password: testUser.password,
      companyName: testUser.companyName
    };

    const registerResponse = await axios.post(`${BASE_URL}${API_PREFIX}/auth/register`, registerData);
    logTest('POST /auth/register (Legacy)',
      registerResponse.status === 201,
      `Status: ${registerResponse.status}`
    );

    // Test legacy login
    const loginData = {
      username: testUser.username,
      password: testUser.password
    };

    const loginResponse = await axios.post(`${BASE_URL}${API_PREFIX}/auth/login`, loginData);
    logTest('POST /auth/login (Legacy)',
      loginResponse.status === 200,
      `Status: ${loginResponse.status}`
    );

    if (loginResponse.data.token) {
      // Test token refresh
      const refreshResponse = await axios.post(`${BASE_URL}${API_PREFIX}/auth/refresh-token`, {
        token: loginResponse.data.token
      });
      logTest('POST /auth/refresh-token',
        refreshResponse.status === 200,
        `Status: ${refreshResponse.status}`
      );
    }

    return true;
  } catch (error) {
    if (error.response) {
      logTest('Legacy Auth', false, `HTTP ${error.response.status}: ${error.response.data.message || error.message}`);
    } else {
      logTest('Legacy Auth', false, `Error: ${error.message}`);
    }
    return false;
  }
}

async function testEnhancedRegistration() {
  logSubsection('Enhanced Registration Flow');

  const uniqueEmail = `test.enhanced.${Date.now()}@example.com`;
  let companyIdentifier = '';

  try {
    // Step 1: Register with company details
    const step1Data = {
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email: uniqueEmail,
      companyName: testUser.companyName,
      country: testUser.country
    };

    const step1Response = await axios.post(`${BASE_URL}${API_PREFIX}/auth/register/step1`, step1Data);
    logTest('POST /auth/register/step1',
      step1Response.status === 201,
      `Status: ${step1Response.status}`
    );

    if (step1Response.data.companyIdentifier) {
      companyIdentifier = step1Response.data.companyIdentifier;
      console.log(`   Company ID: ${companyIdentifier}`.yellow);
    }

    // Step 2: Set credentials
    const step2Data = {
      email: uniqueEmail,
      username: `enhanced_${Date.now()}`,
      password: testUser.password
    };

    const step2Response = await axios.post(`${BASE_URL}${API_PREFIX}/auth/register/step2`, step2Data);
    logTest('POST /auth/register/step2',
      step2Response.status === 200,
      `Status: ${step2Response.status}`
    );

    // Step 3: Complete registration (2FA setup)
    const step3Data = {
      email: uniqueEmail,
      totpToken: '123456' // Mock TOTP token for testing
    };

    const step3Response = await axios.post(`${BASE_URL}${API_PREFIX}/auth/register/step3`, step3Data);
    logTest('POST /auth/register/step3',
      step3Response.status === 201,
      `Status: ${step3Response.status}`
    );

    return { success: true, email: uniqueEmail, companyIdentifier };
  } catch (error) {
    if (error.response) {
      logTest('Enhanced Registration', false, `HTTP ${error.response.status}: ${error.response.data.message || error.message}`);
    } else {
      logTest('Enhanced Registration', false, `Error: ${error.message}`);
    }
    return { success: false };
  }
}

async function testEnhancedLogin(testEmail) {
  logSubsection('Enhanced Login Flow (OTP)');

  if (!testEmail) {
    logTest('Enhanced Login', false, 'No test email provided from registration');
    return false;
  }

  try {
    // Step 1: Initiate login (request OTP)
    const initiateData = {
      email: testEmail
    };

    const initiateResponse = await axios.post(`${BASE_URL}${API_PREFIX}/auth/login/initiate`, initiateData);
    logTest('POST /auth/login/initiate',
      initiateResponse.status === 200,
      `Status: ${initiateResponse.status}`
    );

    // Step 2: Verify OTP (mock verification)
    const verifyData = {
      email: testEmail,
      otpCode: '123456', // Mock OTP for testing
      companyIdentifier: 'KE-N1A2A3N4' // Mock company identifier
    };

    const verifyResponse = await axios.post(`${BASE_URL}${API_PREFIX}/auth/login/verify`, verifyData);
    logTest('POST /auth/login/verify',
      verifyResponse.status === 200,
      `Status: ${verifyResponse.status}`
    );

    return true;
  } catch (error) {
    if (error.response) {
      logTest('Enhanced Login', false, `HTTP ${error.response.status}: ${error.response.data.message || error.message}`);
    } else {
      logTest('Enhanced Login', false, `Error: ${error.message}`);
    }
    return false;
  }
}

async function testSupportEndpoints() {
  logSubsection('Support Endpoints');

  try {
    // Test registration status
    const statusResponse = await axios.get(`${BASE_URL}${API_PREFIX}/auth/register/status/test@example.com`);
    logTest('GET /auth/register/status/:email',
      statusResponse.status === 200,
      `Status: ${statusResponse.status}`
    );

    // Test identifier preview
    const previewResponse = await axios.post(`${BASE_URL}${API_PREFIX}/auth/register/preview-identifier`, {
      companyName: 'Test Company',
      country: 'US'
    });
    logTest('POST /auth/register/preview-identifier',
      previewResponse.status === 200,
      `Status: ${previewResponse.status}`
    );

    // Test resend email
    const resendResponse = await axios.post(`${BASE_URL}${API_PREFIX}/auth/register/resend-email`, {
      email: 'test@example.com',
      step: 'step1'
    });
    logTest('POST /auth/register/resend-email',
      resendResponse.status === 200,
      `Status: ${resendResponse.status}`
    );

    return true;
  } catch (error) {
    if (error.response) {
      logTest('Support Endpoints', false, `HTTP ${error.response.status}: ${error.response.data.message || error.message}`);
    } else {
      logTest('Support Endpoints', false, `Error: ${error.message}`);
    }
    return false;
  }
}

async function testWorkspaceAccess() {
  logSubsection('Workspace Access');

  try {
    // Test get workspaces (should require authentication)
    const workspacesResponse = await axios.get(`${BASE_URL}${API_PREFIX}/auth/workspaces/user@example.com`);
    logTest('GET /auth/workspaces/:email',
      workspacesResponse.status === 200,
      `Status: ${workspacesResponse.status}`
    );

    return true;
  } catch (error) {
    if (error.response) {
      logTest('Workspace Access', false, `HTTP ${error.response.status}: ${error.response.data.message || error.message}`);
    } else {
      logTest('Workspace Access', false, `Error: ${error.message}`);
    }
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Enxero Authentication API Tests'.bold.green);
  console.log(`Base URL: ${BASE_URL}${API_PREFIX}`.gray);

  const startTime = Date.now();

  // Run tests
  logSection('1. Health Check');
  const healthOk = await testHealthCheck();

  if (!healthOk) {
    console.log('\n❌ Server is not responding. Please make sure the server is running on port 3000.'.red);
    return;
  }

  logSection('2. Legacy Authentication');
  await testLegacyAuth();

  logSection('3. Enhanced Registration Flow');
  const registrationResult = await testEnhancedRegistration();

  logSection('4. Enhanced Login Flow');
  await testEnhancedLogin(registrationResult.email);

  logSection('5. Support Endpoints');
  await testSupportEndpoints();

  logSection('6. Workspace Access');
  await testWorkspaceAccess();

  // Summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  logSection('TEST SUMMARY');
  console.log(`Total Tests: ${testResults.total}`.white);
  console.log(`Passed: ${testResults.passed}`.green);
  console.log(`Failed: ${testResults.failed}`.red);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`.yellow);
  console.log(`Duration: ${duration}s`.gray);

  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! The authentication system is working correctly.'.green.bold);
  } else {
    console.log(`\n⚠️  ${testResults.failed} test(s) failed. Please check the implementation.`.yellow.bold);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n⏸️  Tests interrupted by user.'.yellow);
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.log('\n💥 Uncaught Exception:'.red.bold);
  console.log(error.stack.red);
  process.exit(1);
});

// Run tests
runAllTests().catch((error) => {
  console.log('\n💥 Test runner failed:'.red.bold);
  console.log(error.stack.red);
  process.exit(1);
});
