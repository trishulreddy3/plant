const axios = require('axios');

/**
 * Security Testing Script
 * 
 * This script tests various security measures implemented in the application
 * Run this script to verify that security features are working correctly
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:5000';

// Test data
const testCredentials = {
  valid: {
    email: 'admin@pm.com',
    password: 'superadmin123'
  },
  invalid: {
    email: 'test@example.com',
    password: 'wrongpassword'
  }
};

async function testAuthentication() {
  console.log('🔐 Testing Authentication Security...\n');
  
  // Test 1: Valid login
  try {
    console.log('1. Testing valid login...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, testCredentials.valid);
    console.log('   ✅ Valid login successful');
    console.log(`   📊 Response status: ${response.status}`);
    console.log(`   🔑 Token received: ${response.data.tokens ? 'Yes' : 'No'}`);
    return response.data.tokens?.accessToken;
  } catch (error) {
    console.log('   ❌ Valid login failed:', error.response?.data?.error || error.message);
    return null;
  }
}

async function testInvalidAuthentication() {
  console.log('\n2. Testing invalid login...');
  try {
    await axios.post(`${BASE_URL}/api/auth/login`, testCredentials.invalid);
    console.log('   ❌ Invalid login should have failed');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('   ✅ Invalid login properly rejected');
    } else {
      console.log('   ⚠️  Unexpected error:', error.response?.data?.error || error.message);
    }
  }
}

async function testRateLimiting() {
  console.log('\n3. Testing rate limiting...');
  
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      axios.post(`${BASE_URL}/api/auth/login`, testCredentials.invalid)
        .catch(error => error.response)
    );
  }
  
  try {
    const responses = await Promise.all(promises);
    const rateLimited = responses.some(r => r?.status === 429);
    
    if (rateLimited) {
      console.log('   ✅ Rate limiting is working');
    } else {
      console.log('   ⚠️  Rate limiting may not be active');
    }
  } catch (error) {
    console.log('   ❌ Rate limiting test failed:', error.message);
  }
}

async function testProtectedEndpoints(accessToken) {
  console.log('\n4. Testing protected endpoints...');
  
  if (!accessToken) {
    console.log('   ⚠️  Skipping - no access token available');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${accessToken}`
  };
  
  try {
    // Test protected endpoint with token
    const response = await axios.get(`${BASE_URL}/api/companies`, { headers });
    console.log('   ✅ Protected endpoint accessible with valid token');
    console.log(`   📊 Companies found: ${response.data.length}`);
  } catch (error) {
    console.log('   ❌ Protected endpoint failed:', error.response?.data?.error || error.message);
  }
  
  try {
    // Test protected endpoint without token
    await axios.get(`${BASE_URL}/api/companies`);
    console.log('   ❌ Protected endpoint should require authentication');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('   ✅ Protected endpoint properly requires authentication');
    } else {
      console.log('   ⚠️  Unexpected error:', error.response?.data?.error || error.message);
    }
  }
}

async function testInputValidation() {
  console.log('\n5. Testing input validation...');
  
  const invalidInputs = [
    { email: 'invalid-email', password: '123' },
    { email: '', password: '' },
    { email: 'test@example.com', password: 'short' },
    { email: 'test@example.com', password: 'nouppercase123' },
    { email: 'test@example.com', password: 'NOLOWERCASE123' },
    { email: 'test@example.com', password: 'NoNumbers!' }
  ];
  
  let validationTestsPassed = 0;
  
  for (const input of invalidInputs) {
    try {
      await axios.post(`${BASE_URL}/api/auth/login`, input);
      console.log(`   ❌ Invalid input accepted: ${JSON.stringify(input)}`);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log(`   ✅ Invalid input rejected: ${JSON.stringify(input)}`);
        validationTestsPassed++;
      } else {
        console.log(`   ⚠️  Unexpected response for ${JSON.stringify(input)}: ${error.response?.status}`);
      }
    }
  }
  
  console.log(`   📊 Input validation tests passed: ${validationTestsPassed}/${invalidInputs.length}`);
}

async function testSecurityHeaders() {
  console.log('\n6. Testing security headers...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/status`);
    const headers = response.headers;
    
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'strict-transport-security',
      'content-security-policy'
    ];
    
    let headersFound = 0;
    for (const header of securityHeaders) {
      if (headers[header]) {
        console.log(`   ✅ ${header}: ${headers[header]}`);
        headersFound++;
      } else {
        console.log(`   ❌ Missing ${header}`);
      }
    }
    
    console.log(`   📊 Security headers found: ${headersFound}/${securityHeaders.length}`);
  } catch (error) {
    console.log('   ❌ Security headers test failed:', error.message);
  }
}

async function testCORS() {
  console.log('\n7. Testing CORS configuration...');
  
  try {
    const response = await axios.options(`${BASE_URL}/api/companies`, {
      headers: {
        'Origin': 'http://malicious-site.com',
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    if (response.status === 200) {
      console.log('   ⚠️  CORS may be too permissive');
    } else {
      console.log('   ✅ CORS properly configured');
    }
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('   ✅ CORS properly blocks unauthorized origins');
    } else {
      console.log('   ⚠️  CORS test inconclusive:', error.message);
    }
  }
}

async function runSecurityTests() {
  console.log('🛡️  Starting Security Test Suite');
  console.log(`🌐 Testing against: ${BASE_URL}\n`);
  
  try {
    // Run all tests
    const accessToken = await testAuthentication();
    await testInvalidAuthentication();
    await testRateLimiting();
    await testProtectedEndpoints(accessToken);
    await testInputValidation();
    await testSecurityHeaders();
    await testCORS();
    
    console.log('\n🎉 Security test suite completed!');
    console.log('\n📋 Summary:');
    console.log('   - Authentication: Tested valid/invalid credentials');
    console.log('   - Rate Limiting: Tested request limits');
    console.log('   - Authorization: Tested protected endpoints');
    console.log('   - Input Validation: Tested malformed inputs');
    console.log('   - Security Headers: Tested HTTP security headers');
    console.log('   - CORS: Tested cross-origin restrictions');
    
  } catch (error) {
    console.error('\n❌ Security test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runSecurityTests()
    .then(() => {
      console.log('\n✅ Security testing completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Security testing failed:', error);
      process.exit(1);
    });
}

module.exports = { runSecurityTests };





