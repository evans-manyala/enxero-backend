#!/usr/bin/env node

/**
 * End-to-End Authentication Test Suite
 * Tests the complete TOTP authentication flow after cleanup
 */

const axios = require('axios');
const speakeasy = require('speakeasy');

const BASE_URL = 'http://localhost:3001/api/v1';

class AuthE2ETest {
    constructor() {
        this.testData = {
            companyData: {
                name: `Test Company ${Date.now()}`,
                companyFullName: `Test Company Full Name ${Date.now()}`,
                companyShortName: `TC${Date.now()}`,
                identifier: `TEST${Date.now()}`,
                industry: 'Technology',
                size: '10-50',
                country: 'Kenya',
                companyCountry: 'Kenya',
                companyCity: 'Nairobi',
                companyWorkPhone: '+254700000000',
                timezone: 'Africa/Nairobi'
            },
            userData: {
                firstName: 'John',
                lastName: 'Doe',
                fullName: 'John Doe',
                email: `test${Date.now()}@example.com`,
                username: `testuser${Date.now()}`,
                password: 'SecurePass123!',
                phoneNumber: '+254700000001',
                jobTitle: 'System Administrator',
                role: 'admin'
            }
        };
        this.tokens = {};
        this.totpSecret = null;
    }

    async log(message, data = null) {
        console.log(`[${new Date().toISOString()}] ${message}`);
        if (data) {
            console.log(JSON.stringify(data, null, 2));
        }
    }

    async makeRequest(method, endpoint, data = null, headers = {}) {
        try {
            const config = {
                method,
                url: `${BASE_URL}${endpoint}`,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };

            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            return { success: true, data: response.data, status: response.status };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || error.message,
                status: error.response?.status
            };
        }
    }

    generateTOTPCode(secret) {
        return speakeasy.totp({
            secret: secret,
            encoding: 'base32'
        });
    }

    async testHealthCheck() {
        await this.log('🔍 Testing Health Check...');
        const result = await this.makeRequest('GET', '/health');

        if (result.success) {
            await this.log('✅ Health check passed', result.data);
            return true;
        } else {
            await this.log('❌ Health check failed', result.error);
            return false;
        }
    }

    async testUIRegistration() {
        await this.log('🔍 Testing UI Single-Page Registration...');

        const registrationData = {
            company: this.testData.companyData,
            user: this.testData.userData
        };

        const result = await this.makeRequest('POST', '/auth/ui/register', registrationData);

        if (result.success) {
            await this.log('✅ Registration successful', {
                message: result.data.message,
                requiresTOTP: result.data.requiresTOTP
            });

            // Store tokens
            this.tokens.access = result.data.tokens?.accessToken;
            this.tokens.refresh = result.data.tokens?.refreshToken;
            this.totpSecret = result.data.totpSetup?.secret;

            await this.log('📱 TOTP Setup Info', {
                secret: this.totpSecret?.slice(0, 10) + '...',
                qrCodeUrl: result.data.totpSetup?.qrCodeUrl ? 'Generated' : 'Missing'
            });

            return true;
        } else {
            await this.log('❌ Registration failed', result.error);
            return false;
        }
    }

    async testUILoginFlow() {
        await this.log('🔍 Testing UI 4-Step Login Flow...');

        // Step 1: Validate Company Identifier
        await this.log('Step 1: Company Identifier Validation');
        const step1 = await this.makeRequest('POST', '/auth/ui/login/step1/company', {
            companyIdentifier: this.testData.companyData.identifier
        });

        if (!step1.success) {
            await this.log('❌ Step 1 failed', step1.error);
            return false;
        }
        await this.log('✅ Step 1 passed', { companyName: step1.data.companyName });

        // Step 2: Validate Username
        await this.log('Step 2: Username Validation');
        const step2 = await this.makeRequest('POST', '/auth/ui/login/step2/username', {
            companyIdentifier: this.testData.companyData.identifier,
            username: this.testData.userData.username
        });

        if (!step2.success) {
            await this.log('❌ Step 2 failed', step2.error);
            return false;
        }
        await this.log('✅ Step 2 passed', { userExists: step2.data.userExists });

        // Step 3: Validate Password  
        await this.log('Step 3: Password Validation');
        const step3 = await this.makeRequest('POST', '/auth/ui/login/step3/password', {
            companyIdentifier: this.testData.companyData.identifier,
            username: this.testData.userData.username,
            password: this.testData.userData.password
        });

        if (!step3.success) {
            await this.log('❌ Step 3 failed', step3.error);
            return false;
        }
        await this.log('✅ Step 3 passed', {
            sessionId: step3.data.sessionId?.slice(0, 10) + '...',
            requires2FA: step3.data.requires2FA
        });

        // Step 4: TOTP Verification
        await this.log('Step 4: TOTP Verification');
        if (!this.totpSecret) {
            await this.log('❌ No TOTP secret available for verification');
            return false;
        }

        const totpCode = this.generateTOTPCode(this.totpSecret);
        await this.log(`Generated TOTP code: ${totpCode}`);

        const step4 = await this.makeRequest('POST', '/auth/ui/login/step4/totp', {
            sessionId: step3.data.sessionId,
            totpCode: totpCode
        }); if (!step4.success) {
            await this.log('❌ Step 4 failed', step4.error);
            return false;
        }

        await this.log('✅ Step 4 passed - Login Complete!', {
            accessToken: step4.data.tokens?.accessToken?.slice(0, 20) + '...',
            user: step4.data.user?.email
        });

        // Update tokens
        this.tokens.access = step4.data.tokens?.accessToken;
        this.tokens.refresh = step4.data.tokens?.refreshToken;

        return true;
    }

    async test2FAManagement() {
        await this.log('🔍 Testing 2FA Management Endpoints...');

        if (!this.tokens.access) {
            await this.log('❌ No access token available for 2FA tests');
            return false;
        }

        const authHeaders = { 'Authorization': `Bearer ${this.tokens.access}` };

        // Test 2FA Status
        await this.log('Testing 2FA Status...');
        const statusResult = await this.makeRequest('GET', '/auth/2fa/status', null, authHeaders);

        if (statusResult.success) {
            await this.log('✅ 2FA Status retrieved', {
                enabled: statusResult.data.enabled,
                hasBackupCodes: statusResult.data.hasBackupCodes
            });
        } else {
            await this.log('❌ 2FA Status failed', statusResult.error);
            return false;
        }

        // Test Backup Codes Generation
        await this.log('Testing Backup Codes Generation...');
        const backupResult = await this.makeRequest('POST', '/auth/2fa/backup-codes', {
            password: this.testData.userData.password
        }, authHeaders);

        if (backupResult.success) {
            await this.log('✅ Backup codes generated', {
                codesCount: backupResult.data.backupCodes?.length
            });
        } else {
            await this.log('❌ Backup codes generation failed', backupResult.error);
        }

        return true;
    }

    async testLegacyEndpoints() {
        await this.log('🔍 Testing Legacy Endpoint Compatibility...');

        // Test legacy login endpoint
        const legacyLogin = await this.makeRequest('POST', '/auth/login', {
            email: this.testData.userData.email,
            password: this.testData.userData.password
        });

        if (legacyLogin.success) {
            await this.log('✅ Legacy login endpoint works', {
                requiresOTP: legacyLogin.data.requiresOTP,
                sessionId: legacyLogin.data.sessionId?.slice(0, 10) + '...'
            });
            return true;
        } else {
            await this.log('⚠️ Legacy login endpoint response', legacyLogin.error);
            return false;
        }
    }

    async runAllTests() {
        await this.log('🚀 Starting End-to-End Authentication Tests');
        await this.log('='.repeat(60));

        const tests = [
            { name: 'Health Check', fn: () => this.testHealthCheck() },
            { name: 'UI Registration', fn: () => this.testUIRegistration() },
            { name: 'UI Login Flow', fn: () => this.testUILoginFlow() },
            { name: '2FA Management', fn: () => this.test2FAManagement() },
            { name: 'Legacy Compatibility', fn: () => this.testLegacyEndpoints() }
        ];

        const results = [];

        for (const test of tests) {
            await this.log(`\n🧪 Running: ${test.name}`);
            await this.log('-'.repeat(40));

            try {
                const result = await test.fn();
                results.push({ name: test.name, passed: result });

                if (result) {
                    await this.log(`✅ ${test.name} PASSED\n`);
                } else {
                    await this.log(`❌ ${test.name} FAILED\n`);
                }
            } catch (error) {
                await this.log(`💥 ${test.name} ERROR: ${error.message}\n`);
                results.push({ name: test.name, passed: false, error: error.message });
            }
        }

        // Summary
        await this.log('📊 TEST SUMMARY');
        await this.log('='.repeat(60));

        const passed = results.filter(r => r.passed).length;
        const total = results.length;

        for (const result of results) {
            const status = result.passed ? '✅ PASS' : '❌ FAIL';
            await this.log(`${status} - ${result.name}`);
            if (result.error) {
                await this.log(`    Error: ${result.error}`);
            }
        }

        await this.log(`\nOverall: ${passed}/${total} tests passed`);

        if (passed === total) {
            await this.log('🎉 ALL TESTS PASSED! Authentication system is working correctly.');
        } else {
            await this.log('⚠️ Some tests failed. Check the details above.');
        }

        return passed === total;
    }
}

// Run the tests
async function main() {
    const tester = new AuthE2ETest();

    try {
        const allPassed = await tester.runAllTests();
        process.exit(allPassed ? 0 : 1);
    } catch (error) {
        console.error('Test suite failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = AuthE2ETest;
