#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:3001';
const API_PREFIX = '/api/v1';

// Test configuration
const config = {
  timeout: 30000, // 30 seconds
  validateSSL: false
};

// Test data
const testData = {
  company: {
    name: 'Enxero Test Corp',
    fullName: 'Enxero Test Corporation Limited',
    shortName: 'EnxeroTest',
    countryCode: 'KE',
    phoneNumber: '+254712345678',
    workPhone: '+254712345679',
    city: 'Nairobi',
    address: {
      street: '123 Test Street',
      postal: '00100',
      country: 'Kenya'
    }
  },
  owner: {
    firstName: 'John',
    lastName: 'Doe',
    email: `test.${Date.now()}@enxero.test`,
    username: `testuser_${Date.now()}`,
    password: 'TestPassword123!@#'
  }
};

// Store test state
let testState = {
  tokens: {},
  sessionTokens: {},
  companyIdentifier: '',
  userIds: {},
  results: {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  }
};

// Utility functions
function logTest(name, passed, details = '') {
  testState.results.total++;
  if (passed) {
    testState.results.passed++;
    console.log(`✅ ${name}`.green);
    if (details) console.log(`   ${details}`.gray);
  } else {
    testState.results.failed++;
    testState.results.errors.push({ name, details });
    console.log(`❌ ${name}`.red);
    if (details) console.log(`   ${details}`.gray);
  }
}

function logSection(title) {
  console.log(`\n${'='.repeat(80)}`.blue);
  console.log(`${title}`.blue.bold);
  console.log(`${'='.repeat(80)}`.blue);
}

function logSubsection(title) {
  console.log(`\n${'-'.repeat(50)}`.cyan);
  console.log(`${title}`.cyan.bold);
  console.log(`${'-'.repeat(50)}`.cyan);
}

async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${API_PREFIX}${endpoint}`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      data: error.response?.data || null,
      message: error.message
    };
  }
}

// Test suites
async function testServerHealth() {
  logSubsection('Server Health Check');
  
  const response = await makeRequest('GET', '/health');
  logTest(
    'Server Health Check',
    response.success && response.status === 200,
    response.success ? 'Server is running' : `Error: ${response.message}`
  );
  
  return response.success;
}

async function testDatabaseConnection() {
  logSubsection('Database Connection Test');
  
  // Test with POST method as the endpoint expects
  const response = await makeRequest('POST', '/auth/register/preview-identifier', {
    countryCode: 'KE',
    shortName: 'Test'
  });
  
  logTest(
    'Database Connection',
    response.success,
    response.success ? 'Database is accessible' : `DB Error: ${response.message}`
  );
  
  return response.success;
}

async function testLegacyAuthentication() {
  logSubsection('Legacy Authentication Flow');
  
  // Test legacy registration
  const registerData = {
    firstName: testData.owner.firstName,
    lastName: testData.owner.lastName,
    email: testData.owner.email,
    username: testData.owner.username,
    password: testData.owner.password,
    companyName: testData.company.name
  };
  
  const registerResponse = await makeRequest('POST', '/auth/register', registerData);
  logTest(
    'Legacy Registration',
    registerResponse.success && [200, 201].includes(registerResponse.status),
    registerResponse.success 
      ? `User registered successfully`
      : `Error: ${registerResponse.data?.message || registerResponse.message}`
  );
  
  if (registerResponse.success) {
    // Store auth token
    if (registerResponse.data.data?.accessToken) {
      testState.tokens.legacy = registerResponse.data.data.accessToken;
    }
    
    // Test legacy login with different user
    const loginData = {
      email: 'john.doe@example.com', // Use seeded user
      password: 'password123'
    };
    
    const loginResponse = await makeRequest('POST', '/auth/login', loginData);
    logTest(
      'Legacy Login (Seeded User)',
      loginResponse.success && loginResponse.status === 200,
      loginResponse.success 
        ? 'Login successful'
        : `Error: ${loginResponse.data?.message || loginResponse.message}`
    );
    
    if (loginResponse.success && loginResponse.data.data?.refreshToken) {
      // Test token refresh
      const refreshData = {
        refreshToken: loginResponse.data.data.refreshToken
      };
      
      const refreshResponse = await makeRequest('POST', '/auth/refresh', refreshData);
      logTest(
        'Token Refresh',
        refreshResponse.success && refreshResponse.status === 200,
        refreshResponse.success 
          ? 'Token refreshed successfully'
          : `Error: ${refreshResponse.data?.message || refreshResponse.message}`
      );
    }
  }
  
  return registerResponse.success;
}

async function testMultiStepRegistration() {
  logSubsection('Multi-Step Registration Flow');
  
  // Step 1: Company Registration
  const step1Data = {
    companyName: testData.company.name,
    fullName: testData.company.fullName,
    shortName: testData.company.shortName,
    countryCode: testData.company.countryCode,
    phoneNumber: testData.company.phoneNumber,
    workPhone: testData.company.workPhone,
    city: testData.company.city,
    address: testData.company.address,
    ownerEmail: `step1_${Date.now()}@enxero.test`,
    ownerFirstName: testData.owner.firstName,
    ownerLastName: testData.owner.lastName
  };
  
  const step1Response = await makeRequest('POST', '/auth/register/step1', step1Data);
  logTest(
    'Step 1: Company Registration',
    step1Response.success && step1Response.status === 201,
    step1Response.success 
      ? `Company registered: ${step1Response.data.data?.companyIdentifier}`
      : `Error: ${step1Response.data?.message || step1Response.message}`
  );
  
  if (step1Response.success && step1Response.data.data?.sessionToken) {
    testState.sessionTokens.step1 = step1Response.data.data.sessionToken;
    testState.companyIdentifier = step1Response.data.data.companyIdentifier;
    
    // Step 2: Username and Password Setup
    const step2Data = {
      sessionToken: step1Response.data.data.sessionToken,
      username: `step2user_${Date.now()}`,
      password: testData.owner.password,
      confirmPassword: testData.owner.password
    };
    
    const step2Response = await makeRequest('POST', '/auth/register/step2', step2Data);
    logTest(
      'Step 2: Username/Password Setup',
      step2Response.success && step2Response.status === 200,
      step2Response.success 
        ? 'Credentials set successfully'
        : `Error: ${step2Response.data?.message || step2Response.message}`
    );
    
    if (step2Response.success) {
      // Step 3: 2FA Setup (would normally require real TOTP)
      // For testing purposes, we'll just test the endpoint structure
      const step3Data = {
        sessionToken: step1Response.data.data.sessionToken,
        twoFactorToken: '123456', // Test token
        backupCodes: ['code1', 'code2', 'code3', 'code4', 'code5']
      };
      
      const step3Response = await makeRequest('POST', '/auth/register/step3', step3Data);
      logTest(
        'Step 3: 2FA Setup (Structure Test)',
        step3Response.status === 400 || step3Response.success, // Expect validation error with test token
        step3Response.success 
          ? 'Registration completed'
          : `Expected validation error: ${step3Response.data?.message || step3Response.message}`
      );
    }
  }
  
  return step1Response.success;
}

async function testTOTPAuthentication() {
  logSubsection('TOTP Authentication Flow');
  
  // Test TOTP login initiate (should fail without valid user)
  const totpInitiateData = {
    email: 'john.doe@example.com',
    password: 'password123'
  };
  
  const totpInitiateResponse = await makeRequest('POST', '/auth/totp/login/initiate', totpInitiateData);
  logTest(
    'TOTP Login Initiate',
    totpInitiateResponse.success,
    totpInitiateResponse.success 
      ? 'TOTP login initiated'
      : `Error: ${totpInitiateResponse.data?.message || totpInitiateResponse.message}`
  );
  
  // Test 2FA setup (requires authentication)
  const setup2FAResponse = await makeRequest('POST', '/auth/2fa/setup');
  logTest(
    '2FA Setup Endpoint',
    setup2FAResponse.status === 401 || setup2FAResponse.status === 400, // Expect auth error
    'Properly requires authentication'
  );
  
  return true;
}

async function testSupportEndpoints() {
  logSubsection('Support & Utility Endpoints');
  
  // Test company identifier preview
  const previewData = {
    countryCode: 'US',
    shortName: 'TestCorp'
  };
  
  const previewResponse = await makeRequest('POST', '/auth/register/preview-identifier', previewData);
  logTest(
    'Company Identifier Preview',
    previewResponse.success && previewResponse.status === 200,
    previewResponse.success 
      ? `Preview: ${previewResponse.data.data?.identifier}`
      : `Error: ${previewResponse.data?.message || previewResponse.message}`
  );
  
  // Test workspace access check
  const workspaceData = {
    userId: 'test-user-id'
  };
  
  const workspaceResponse = await makeRequest('POST', '/auth/workspace/check-access', workspaceData);
  logTest(
    'Workspace Access Check',
    workspaceResponse.status === 400 || workspaceResponse.status === 404, // Expect user not found
    'Workspace endpoint responding properly'
  );
  
  return true;
}

async function testErrorHandling() {
  logSubsection('Error Handling & Edge Cases');
  
  // Test invalid login
  const invalidLoginData = {
    email: 'nonexistent@test.com',
    password: 'wrongpassword'
  };
  
  const invalidLoginResponse = await makeRequest('POST', '/auth/login', invalidLoginData);
  logTest(
    'Invalid Login Handling',
    invalidLoginResponse.status === 401,
    'Invalid credentials properly rejected'
  );
  
  // Test malformed request
  const malformedResponse = await makeRequest('POST', '/auth/register', { invalidField: 'test' });
  logTest(
    'Malformed Request Handling',
    malformedResponse.status === 400,
    'Malformed request properly rejected'
  );
  
  // Test 404 endpoint
  const notFoundResponse = await makeRequest('GET', '/nonexistent');
  logTest(
    '404 Error Handling',
    notFoundResponse.status === 404,
    '404 error properly returned'
  );
  
  return true;
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Enhanced Enxero Authentication API Tests'.yellow.bold);
  console.log(`Base URL: ${BASE_URL}${API_PREFIX}`);
  console.log(`Test Data: Company - ${testData.company.name}, Owner - ${testData.owner.email}\n`);
  
  const startTime = Date.now();
  
  try {
    // Run all tests
    logSection('1. SYSTEM HEALTH & DATABASE');
    await testServerHealth();
    await testDatabaseConnection();
    
    logSection('2. LEGACY AUTHENTICATION');
    await testLegacyAuthentication();
    
    logSection('3. MULTI-STEP REGISTRATION');
    await testMultiStepRegistration();
    
    logSection('4. TOTP AUTHENTICATION');
    await testTOTPAuthentication();
    
    logSection('5. SUPPORT ENDPOINTS');
    await testSupportEndpoints();
    
    logSection('6. ERROR HANDLING');
    await testErrorHandling();
    
  } catch (error) {
    console.error('Test execution failed:'.red, error.message);
    testState.results.failed++;
  }
  
  // Final report
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const successRate = ((testState.results.passed / testState.results.total) * 100).toFixed(1);
  
  logSection('📊 COMPREHENSIVE TEST REPORT');
  console.log(`Total Tests: ${testState.results.total}`);
  console.log(`Passed: ${testState.results.passed}`.green);
  console.log(`Failed: ${testState.results.failed}`.red);
  console.log(`Success Rate: ${successRate}%`);
  console.log(`Duration: ${duration}s`);
  
  if (testState.results.failed > 0) {
    console.log('\n📋 Failed Tests Summary:'.red.bold);
    testState.results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.name}`.red);
      console.log(`   ${error.details}`.gray);
    });
  }
  
  console.log('\n🔧 System Information:');
  console.log(`Database: AWS RDS PostgreSQL`);
  console.log(`Company Identifier: ${testState.companyIdentifier || 'Not generated'}`);
  console.log(`Tokens Generated: ${Object.keys(testState.tokens).length}`);
  console.log(`Session Tokens: ${Object.keys(testState.sessionTokens).length}`);
  
  if (testState.results.failed > 0) {
    console.log(`\n⚠️  ${testState.results.failed} test(s) failed. Please review the implementation.`.yellow);
    console.log('💡 Check the error details above for specific issues.'.cyan);
  } else {
    console.log('\n🎉 All tests passed! The authentication system is working correctly.'.green.bold);
  }
  
  console.log('\n📝 Next Steps:');
  console.log('1. Review any failed tests and fix implementation issues');
  console.log('2. Test with real email/SMS providers for production');
  console.log('3. Implement rate limiting and security measures');
  console.log('4. Set up monitoring and logging for production');
}

// Run the tests
runTests().catch(console.error);
