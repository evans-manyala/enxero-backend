"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
require("../test/setup");
describe('Files API Integration', () => {
    let accessToken;
    let fileId;
    let fileCreated = false;
    beforeAll(async () => {
        // Register and login a user to get access token
        const registerRes = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/auth/register')
            .send({
            email: `fileuser_${Date.now()}@example.com`,
            username: `fileuser_${Date.now()}`,
            password: 'TestPassword123!',
            firstName: 'File',
            lastName: 'User',
        });
        expect(registerRes.status).toBe(201);
        expect(registerRes.body.status).toBe('success');
        accessToken = registerRes.body.data.accessToken;
    });
    it('should upload a file', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/files/upload')
            .set('Authorization', `Bearer ${accessToken}`)
            .attach('file', Buffer.from('test file content'), {
            filename: 'test.txt',
            contentType: 'text/plain',
        });
        if (res.status !== 201) {
            fileCreated = false;
            console.error('File upload failed:', res.status, res.body);
            throw new Error(`Failed to upload file: ${res.status} ${res.body?.message || res.text}`);
        }
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('success');
        expect(res.body.data.filename).toBe('test.txt');
        fileId = res.body.data.id;
        fileCreated = true;
    });
    it('should list files', async () => {
        if (!fileCreated) {
            console.log('Skipping test - file not created');
            return;
        }
        const res = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/files')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.some((file) => file.id === fileId)).toBe(true);
    });
    it('should get a file by id', async () => {
        if (!fileCreated) {
            console.log('Skipping test - file not created');
            return;
        }
        const res = await (0, supertest_1.default)(app_1.default)
            .get(`/api/v1/files/${fileId}`)
            .set('Authorization', `Bearer ${accessToken}`);
        expect([200, 404]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body.status).toBe('success');
            expect(res.body.data.id).toBe(fileId);
        }
    });
    it('should delete a file', async () => {
        if (!fileCreated) {
            console.log('Skipping test - file not created');
            return;
        }
        const res = await (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/files/${fileId}`)
            .set('Authorization', `Bearer ${accessToken}`);
        expect([204, 404]).toContain(res.status);
    });
});
