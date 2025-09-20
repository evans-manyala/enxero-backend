// Debug SMS service integration
require('dotenv').config();

const testSMSService = async () => {
  console.log('🔍 Testing SMS Service Integration...');
  
  // Test environment variables
  console.log('Provider:', process.env.SMS_PROVIDER);
  console.log('API Key:', process.env.SMS_API_KEY ? 'Set ✓' : 'Missing ✗');
  console.log('Sender ID:', process.env.SMS_SENDER_ID);
  console.log('Endpoint:', process.env.SMS_ENDPOINT);
  
  // Import and test the actual SMS service
  try {
    const { createSMSService } = require('./dist/shared/services/sms.service.js');
    const smsService = createSMSService();
    
    console.log('\n📤 Testing SMS service sendOTP method...');
    
    const result = await smsService.sendOTP('+254785406848', '123456', 'Enxero');
    
    console.log('✅ SMS Service Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ SMS Service Error:', error.message);
    console.error('Stack:', error.stack);
  }
};

testSMSService();
