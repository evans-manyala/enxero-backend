"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
require("../test/setup");
describe('Notifications API Integration', () => {
    let accessToken;
    let notificationId;
    let userId;
    beforeAll(async () => {
        // Register and login a user to get access token and userId
        const registerRes = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/auth/register')
            .send({
            email: `notificationuser_${Date.now()}@example.com`,
            username: `notificationuser_${Date.now()}`,
            password: 'TestPassword123!',
            firstName: 'Notification',
            lastName: 'User',
        });
        expect(registerRes.status).toBe(201);
        expect(registerRes.body.status).toBe('success');
        accessToken = registerRes.body.data.accessToken;
        userId = registerRes.body.data.user.id;
    });
    it('should send a notification', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/notifications/send')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
            type: 'info',
            message: 'Test notification',
            data: { foo: 'bar' },
        });
        expect([200, 201]).toContain(res.status);
        expect(res.body.status).toBe('success');
        expect(res.body.data.message).toBe('Test notification');
        notificationId = res.body.data.id;
    });
    it('should list notifications', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/notifications')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.some((n) => n.id === notificationId)).toBe(true);
    });
    it('should mark a notification as read', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/notifications/${notificationId}/read`)
            .set('Authorization', `Bearer ${accessToken}`);
        expect([200, 204]).toContain(res.status);
    });
    it('should delete a notification', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/notifications/${notificationId}`)
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(204);
    });
});
