// Test different sender IDs with Infobip
require('dotenv').config();
const axios = require('axios');

const testSenderIds = async () => {
  const senderIds = [
    'InfoSMS',      // Default Infobip sender
    'INFOBIP',      // Infobip brand
    '447491163443', // Infobip trial number
    '12345',        // Numeric sender
    'TEST'          // Simple alphanumeric
  ];

  for (const senderId of senderIds) {
    console.log(`\n🧪 Testing sender ID: "${senderId}"`);
    
    const payload = {
      messages: [{
        from: senderId,
        destinations: [{ to: '+254785406848' }],
        text: `Test SMS with sender "${senderId}" - Your verification code is: 123456`
      }]
    };

    try {
      const response = await axios.post(
        `${process.env.SMS_ENDPOINT}/sms/2/text/advanced`,
        payload,
        {
          headers: {
            'Authorization': `App ${process.env.SMS_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      const result = response.data.messages[0];
      console.log(`✅ Status: ${result.status.name} (${result.status.description})`);
      console.log(`📱 Message ID: ${result.messageId}`);
      
      if (result.status.groupName === 'PENDING') {
        console.log(`🎉 SUCCESS! Sender "${senderId}" works - use this one!`);
        break;
      }
      
    } catch (error) {
      console.log(`❌ Failed: ${error.response?.data?.requestError?.serviceException?.text || error.message}`);
    }
    
    // Wait 2 seconds between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
};

testSenderIds();
