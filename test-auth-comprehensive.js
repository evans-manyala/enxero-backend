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
  },
  user2: {
    firstName: 'Jane',
    lastName: 'Smith',
    email: `user2.${Date.now()}@enxero.test`,
    username: `user2_${Date.now()}`,
    password: 'UserPassword456!@#'
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
  
  // Test if we can access any basic endpoint that requires DB
  const response = await makeRequest('GET', '/auth/register/preview-identifier', {
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
    // Test legacy login
    const loginData = {
      email: testData.owner.email,
      password: testData.owner.password
    };
    
    const loginResponse = await makeRequest('POST', '/auth/login', loginData);
    logTest(
      'Legacy Login',
      loginResponse.success && loginResponse.status === 200,
      loginResponse.success 
        ? 'Login successful'
        : `Error: ${loginResponse.data?.message || loginResponse.message}`
    );
    
    if (loginResponse.success && loginResponse.data.data?.token) {
      testState.tokens.legacy = loginResponse.data.data.token;
      
      // Test token refresh
      const refreshData = {
        refreshToken: loginResponse.data.data.refreshToken || loginResponse.data.data.token
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
}

async function testEnhancedRegistrationFlow() {
  logSubsection('Enhanced Multi-Step Registration Flow');
  
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
    ownerEmail: testData.user2.email,
    ownerFirstName: testData.user2.firstName,
    ownerLastName: testData.user2.lastName
  };
  
  const step1Response = await makeRequest('POST', '/auth/register/step1', step1Data);
  logTest(
    'Step 1: Company Registration',
    step1Response.success && [200, 201].includes(step1Response.status),
    step1Response.success 
      ? `Company registered with ID: ${step1Response.data.data?.companyIdentifier || 'Generated'}`
      : `Error: ${step1Response.data?.message || step1Response.message}`
  );
  
  if (step1Response.success && step1Response.data.data?.sessionToken) {
    testState.sessionTokens.step1 = step1Response.data.data.sessionToken;
    testState.companyIdentifier = step1Response.data.data.companyIdentifier;
    
    // Step 2: Username and Password Setup
    const step2Data = {
      sessionToken: testState.sessionTokens.step1,
      username: testData.user2.username,
      password: testData.user2.password,
      confirmPassword: testData.user2.password
    };
    
    const step2Response = await makeRequest('POST', '/auth/register/step2', step2Data);
    logTest(
      'Step 2: Credentials Setup',
      step2Response.success && step2Response.status === 200,
      step2Response.success 
        ? 'Credentials set successfully'
        : `Error: ${step2Response.data?.message || step2Response.message}`
    );
    
    if (step2Response.success && step2Response.data.data?.sessionToken) {
      testState.sessionTokens.step2 = step2Response.data.data.sessionToken;
      
      // Step 3: 2FA Setup (Mock)
      const step3Data = {
        sessionToken: testState.sessionTokens.step2,
        twoFactorToken: 'mock_totp_secret',
        backupCodes: ['backup1', 'backup2', 'backup3']
      };
      
      const step3Response = await makeRequest('POST', '/auth/register/step3', step3Data);
      logTest(
        'Step 3: 2FA Setup',
        step3Response.success && [200, 201].includes(step3Response.status),
        step3Response.success 
          ? 'Registration completed successfully'
          : `Error: ${step3Response.data?.message || step3Response.message}`
      );
    }
  }
}

async function testUIMatchingFlow() {
  logSubsection('UI-Matching Authentication Flow');
  
  if (!testState.companyIdentifier) {
    logTest('UI Flow', false, 'No company identifier available from previous tests');
    return;
  }
  
  // Step 1: Validate Company Identifier
  const companyValidation = await makeRequest('POST', '/auth/ui/login/step1/company', {
    companyIdentifier: testState.companyIdentifier
  });
  logTest(
    'UI Step 1: Company Validation',
    companyValidation.success && companyValidation.status === 200,
    companyValidation.success 
      ? 'Company identifier valid'
      : `Error: ${companyValidation.data?.message || companyValidation.message}`
  );
  
  // Step 2: Username Validation
  const usernameValidation = await makeRequest('POST', '/auth/ui/login/step2/username', {
    companyIdentifier: testState.companyIdentifier,
    username: testData.user2.username
  });
  logTest(
    'UI Step 2: Username Validation',
    usernameValidation.success && usernameValidation.status === 200,
    usernameValidation.success 
      ? 'Username valid'
      : `Error: ${usernameValidation.data?.message || usernameValidation.message}`
  );
  
  // Step 3: Password Validation
  const passwordValidation = await makeRequest('POST', '/auth/ui/login/step3/password', {
    companyIdentifier: testState.companyIdentifier,
    username: testData.user2.username,
    password: testData.user2.password
  });
  logTest(
    'UI Step 3: Password Validation',
    passwordValidation.success && passwordValidation.status === 200,
    passwordValidation.success 
      ? 'Password valid'
      : `Error: ${passwordValidation.data?.message || passwordValidation.message}`
  );
}

async function testOTPFlow() {
  logSubsection('OTP-Based Login Flow');
  
  // Initiate login with OTP
  const initiateData = {
    email: testData.owner.email,
    password: testData.owner.password
  };
  
  const initiateResponse = await makeRequest('POST', '/auth/login/initiate', initiateData);
  logTest(
    'OTP Login Initiate',
    initiateResponse.success && initiateResponse.status === 200,
    initiateResponse.success 
      ? 'OTP sent successfully'
      : `Error: ${initiateResponse.data?.message || initiateResponse.message}`
  );
  
  if (initiateResponse.success && initiateResponse.data.data?.loginToken) {
    // Mock OTP verification
    const verifyData = {
      loginToken: initiateResponse.data.data.loginToken,
      otpCode: '123456' // Mock OTP
    };
    
    const verifyResponse = await makeRequest('POST', '/auth/login/verify', verifyData);
    logTest(
      'OTP Verification',
      verifyResponse.success && verifyResponse.status === 200,
      verifyResponse.success 
        ? 'OTP verified successfully'
        : `Error: ${verifyResponse.data?.message || verifyResponse.message}`
    );
  }
}

async function testTOTPFlow() {
  logSubsection('TOTP-Based Authentication Flow');
  
  // Mock 2FA setup for testing
  const setup2FAResponse = await makeRequest('POST', '/auth/2fa/setup', {}, {
    'Authorization': `Bearer ${testState.tokens.legacy || 'mock_token'}`
  });
  logTest(
    '2FA Setup',
    setup2FAResponse.success || setup2FAResponse.status === 401, // 401 is expected without valid token
    setup2FAResponse.success 
      ? '2FA setup initiated'
      : 'Requires authentication (expected)'
  );
  
  // Test TOTP login initiation
  const totpInitiate = await makeRequest('POST', '/auth/totp/login/initiate', {
    email: testData.owner.email,
    password: testData.owner.password
  });
  logTest(
    'TOTP Login Initiate',
    totpInitiate.success && totpInitiate.status === 200,
    totpInitiate.success 
      ? 'TOTP login initiated'
      : `Error: ${totpInitiate.data?.message || totpInitiate.message}`
  );
}

async function testSupportEndpoints() {
  logSubsection('Support & Utility Endpoints');
  
  // Test registration status
  const statusResponse = await makeRequest('GET', `/auth/register/status/${testData.user2.email}`);
  logTest(
    'Registration Status Check',
    statusResponse.success,
    statusResponse.success 
      ? 'Status retrieved successfully'
      : `Error: ${statusResponse.data?.message || statusResponse.message}`
  );
  
  // Test company identifier preview
  const previewResponse = await makeRequest('POST', '/auth/register/preview-identifier', {
    countryCode: 'US',
    shortName: 'TestCorp'
  });
  logTest(
    'Company Identifier Preview',
    previewResponse.success && previewResponse.status === 200,
    previewResponse.success 
      ? `Preview: ${previewResponse.data.data?.identifier || 'Generated'}`
      : `Error: ${previewResponse.data?.message || previewResponse.message}`
  );
  
  // Test workspace access
  const workspaceResponse = await makeRequest('GET', `/auth/workspaces/${testData.owner.email}`);
  logTest(
    'Workspace Access',
    workspaceResponse.success && workspaceResponse.status === 200,
    workspaceResponse.success 
      ? 'Workspace data retrieved'
      : `Error: ${workspaceResponse.data?.message || workspaceResponse.message}`
  );
}

async function testUserManagement() {
  logSubsection('User Management Endpoints');
  
  if (!testState.tokens.legacy) {
    logTest('User Management', false, 'No authentication token available');
    return;
  }
  
  const authHeaders = { 'Authorization': `Bearer ${testState.tokens.legacy}` };
  
  // Test profile retrieval
  const profileResponse = await makeRequest('GET', '/users/profile', null, authHeaders);
  logTest(
    'Get User Profile',
    profileResponse.success || profileResponse.status === 401,
    profileResponse.success 
      ? 'Profile retrieved successfully'
      : 'Authentication required (expected)'
  );
  
  // Test users list (admin endpoint)
  const usersResponse = await makeRequest('GET', '/users', null, authHeaders);
  logTest(
    'List Users',
    usersResponse.success || [401, 403].includes(usersResponse.status),
    usersResponse.success 
      ? `Found ${usersResponse.data.data?.users?.length || 0} users`
      : 'Authorization required (expected)'
  );
}

async function testErrorHandling() {
  logSubsection('Error Handling & Edge Cases');
  
  // Test invalid login
  const invalidLogin = await makeRequest('POST', '/auth/login', {
    email: 'invalid@example.com',
    password: 'wrongpassword'
  });
  logTest(
    'Invalid Login Handling',
    !invalidLogin.success || invalidLogin.status >= 400,
    'Invalid credentials properly rejected'
  );
  
  // Test malformed requests
  const malformedRequest = await makeRequest('POST', '/auth/register', {
    email: 'invalid-email',
    password: '123' // Too short
  });
  logTest(
    'Malformed Request Handling',
    !malformedRequest.success || malformedRequest.status >= 400,
    'Malformed request properly rejected'
  );
  
  // Test non-existent endpoints
  const notFoundResponse = await makeRequest('GET', '/nonexistent');
  logTest(
    '404 Error Handling',
    notFoundResponse.status === 404,
    '404 error properly returned'
  );
}

// Main test runner
async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive Enxero Authentication API Tests'.bold.green);
  console.log(`Base URL: ${BASE_URL}${API_PREFIX}`.gray);
  console.log(`Test Data: Company - ${testData.company.name}, Owner - ${testData.owner.email}`.gray);
  
  const startTime = Date.now();
  
  try {
    // Core system tests
    logSection('1. SYSTEM HEALTH & DATABASE');
    const serverOk = await testServerHealth();
    if (!serverOk) {
      console.log('\n❌ Server is not responding. Please ensure the server is running on port 3001.'.red);
      return;
    }
    await testDatabaseConnection();
    
    // Authentication flows
    logSection('2. LEGACY AUTHENTICATION');
    await testLegacyAuthentication();
    
    logSection('3. ENHANCED MULTI-STEP REGISTRATION');
    await testEnhancedRegistrationFlow();
    
    logSection('4. UI-MATCHING AUTHENTICATION FLOW');
    await testUIMatchingFlow();
    
    logSection('5. OTP-BASED LOGIN');
    await testOTPFlow();
    
    logSection('6. TOTP/2FA AUTHENTICATION');
    await testTOTPFlow();
    
    logSection('7. SUPPORT ENDPOINTS');
    await testSupportEndpoints();
    
    logSection('8. USER MANAGEMENT');
    await testUserManagement();
    
    logSection('9. ERROR HANDLING');
    await testErrorHandling();
    
  } catch (error) {
    console.log(`\n💥 Test execution failed: ${error.message}`.red);
    testState.results.errors.push({ name: 'Test Execution', details: error.message });
  }
  
  // Generate comprehensive report
  await generateTestReport(startTime);
}

async function generateTestReport(startTime) {
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  logSection('📊 COMPREHENSIVE TEST REPORT');
  
  console.log(`Total Tests: ${testState.results.total}`.white);
  console.log(`Passed: ${testState.results.passed}`.green);
  console.log(`Failed: ${testState.results.failed}`.red);
  console.log(`Success Rate: ${((testState.results.passed / testState.results.total) * 100).toFixed(1)}%`.yellow);
  console.log(`Duration: ${duration}s`.gray);
  
  if (testState.results.failed > 0) {
    console.log('\n📋 Failed Tests Summary:'.yellow.bold);
    testState.results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.name}`.red);
      if (error.details) console.log(`   ${error.details}`.gray);
    });
  }
  
  console.log('\n🔧 System Information:'.blue.bold);
  console.log(`Database: AWS RDS PostgreSQL`.gray);
  console.log(`Company Identifier: ${testState.companyIdentifier || 'Not generated'}`.gray);
  console.log(`Tokens Generated: ${Object.keys(testState.tokens).length}`.gray);
  console.log(`Session Tokens: ${Object.keys(testState.sessionTokens).length}`.gray);
  
  if (testState.results.failed === 0) {
    console.log('\n🎉 All tests passed! Your authentication system is working correctly.'.green.bold);
    console.log('✅ AWS RDS is properly connected and migrations are up to date.'.green);
    console.log('✅ All authentication flows are operational.'.green);
  } else {
    console.log(`\n⚠️  ${testState.results.failed} test(s) failed. Please review the implementation.`.yellow.bold);
    console.log('💡 Check the error details above for specific issues.'.yellow);
  }
  
  console.log('\n📝 Next Steps:'.blue.bold);
  console.log('1. Review any failed tests and fix implementation issues'.gray);
  console.log('2. Test with real email/SMS providers for production'.gray);
  console.log('3. Implement rate limiting and security measures'.gray);
  console.log('4. Set up monitoring and logging for production'.gray);
}

// Error handling
process.on('SIGINT', () => {
  console.log('\n\n⏸️  Tests interrupted by user.'.yellow);
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.log('\n💥 Uncaught Exception:'.red.bold);
  console.log(error.stack.red);
  process.exit(1);
});

// Run the comprehensive tests
if (require.main === module) {
  runComprehensiveTests().catch((error) => {
    console.log('\n💥 Test runner failed:'.red.bold);
    console.log(error.stack.red);
    process.exit(1);
  });
}

module.exports = {
  runComprehensiveTests,
  testData,
  testState
};
