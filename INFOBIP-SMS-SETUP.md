# Infobip SMS Integration Setup Guide

## Overview
Infobip SMS provider has been successfully integrated into the Enxero Platform OTP system. This guide will help you configure and test the Infobip SMS service.

## 🔧 Configuration Steps

### 1. Get Infobip Credentials
From your Infobip trial account, you'll need:
- **API Key**: Found in your Infobip portal under API settings
- **Sender ID**: Your approved sender name/number (e.g., "Enxero" or a phone number)
- **Base URL**: Usually `https://api.infobip.com` (default)

### 2. Environment Configuration
Update your `.env` file with Infobip credentials:

```bash
# SMS Configuration
SMS_PROVIDER=infobip
SMS_API_KEY=your_infobip_api_key_here
SMS_SENDER_ID=Enxero
SMS_ENDPOINT=https://api.infobip.com
```

**Note**: You don't need `SMS_API_SECRET` for Infobip - only the API key is required.

### 3. Sender ID Options
- **Alphanumeric**: Use your company name (e.g., "Enxero", "YourApp")
- **Numeric**: Use a phone number if you have one registered
- **Trial**: During trial, you may be limited to certain sender IDs

## 📱 Testing the Integration

### 1. Start the Server
```bash
npm run build
npm start
```

### 2. Test OTP Generation
```bash
curl -X POST http://localhost:3000/api/v1/otp/company/generate \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'
```

### 3. Expected Response
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "otpId": "uuid-here",
    "expiresAt": "2025-08-22T15:30:00.000Z",
    "phoneNumber": "+12*****90"
  }
}
```

### 4. Check Server Logs
You should see:
```
📱 OTP sent via infobip to +1234567890
🔐 OTP for +1234567890: 123456
```

## 🔍 Troubleshooting

### Common Issues

**1. Authentication Error**
```
SMS sending failed: Unauthorized
```
- Verify your API key is correct
- Check if the API key has SMS permissions

**2. Invalid Sender ID**
```
SMS sending failed: Invalid sender
```
- Use an approved sender ID from your Infobip account
- For trial accounts, use alphanumeric sender (e.g., "Enxero")

**3. Invalid Phone Number**
```
SMS sending failed: Invalid destination
```
- Ensure phone numbers are in E.164 format (+1234567890)
- Check if the destination country is supported

**4. Quota Exceeded**
```
SMS sending failed: Insufficient credits
```
- Check your Infobip account balance/credits
- Trial accounts have limited credits

### Debug Mode
Enable detailed logging by setting:
```bash
NODE_ENV=development
```

This will log both SMS results and OTP codes to the console.

## 📊 Infobip Features Supported

### ✅ Implemented
- **SMS Sending**: Basic text messages
- **Status Tracking**: Message ID and delivery status
- **Error Handling**: Comprehensive error messages
- **Cost Tracking**: Message cost information
- **International Support**: Global SMS delivery

### 🔄 Available for Future Enhancement
- **Delivery Reports**: Webhook integration for delivery status
- **Message Templates**: Pre-approved message templates
- **Two-way SMS**: Receiving SMS responses
- **Rich Media**: MMS and multimedia messages

## 🚀 Production Considerations

### 1. Sender ID Registration
- Register your brand name as sender ID
- Complete sender ID verification process
- Consider using a dedicated phone number

### 2. Message Templates
- Create pre-approved templates for faster delivery
- Comply with local regulations and carrier requirements

### 3. Monitoring
- Set up delivery report webhooks
- Monitor SMS delivery rates and failures
- Track costs and usage patterns

### 4. Compliance
- Follow local SMS regulations
- Implement opt-out mechanisms
- Respect rate limits and sending windows

## 📋 Environment Variables Reference

```bash
# Required for Infobip
SMS_PROVIDER=infobip
SMS_API_KEY=your_infobip_api_key
SMS_SENDER_ID=your_sender_id

# Optional
SMS_ENDPOINT=https://api.infobip.com  # Default Infobip endpoint
NODE_ENV=development                   # For debug logging
```

## 🔗 Useful Links
- [Infobip API Documentation](https://www.infobip.com/docs/api)
- [SMS API Reference](https://www.infobip.com/docs/api#channels/sms)
- [Sender ID Guidelines](https://www.infobip.com/docs/sms/sender-names)

Your Infobip SMS integration is now ready for testing! 🎉
