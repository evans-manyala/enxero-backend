"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
require("../test/setup");
const client_1 = require("@prisma/client");
describe('Roles API Integration', () => {
    let accessToken;
    let roleId;
    const testRoleName = `TestRole_${Date.now()}`;
    const prisma = new client_1.PrismaClient();
    let userId;
    beforeAll(async () => {
        // Register and login a user to get access token
        const registerRes = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/auth/register')
            .send({
            email: `roleuser_${Date.now()}@example.com`,
            username: `roleuser_${Date.now()}`,
            password: 'TestPassword123!',
            firstName: 'Role',
            lastName: 'User',
        });
        expect(registerRes.status).toBe(201);
        expect(registerRes.body.status).toBe('success');
        accessToken = registerRes.body.data.accessToken;
        userId = registerRes.body.data.user.id;
        // Ensure ADMIN role exists
        let adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
        if (!adminRole) {
            adminRole = await prisma.role.create({
                data: {
                    name: 'ADMIN',
                    description: 'Administrator role',
                    permissions: ['write:all', 'read:all', 'delete:all', 'manage:roles', 'manage:users', 'manage:companies'],
                    isActive: true,
                },
            });
        }
        else {
            // Update existing ADMIN role to ensure it has the required permissions
            adminRole = await prisma.role.update({
                where: { name: 'ADMIN' },
                data: {
                    permissions: ['write:all', 'read:all', 'delete:all', 'manage:roles', 'manage:users', 'manage:companies'],
                },
            });
        }
        // Assign ADMIN role to the test user
        await prisma.user.update({
            where: { id: userId },
            data: { roleId: adminRole.id },
        });
    });
    it('should create a new role', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/roles')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
            name: testRoleName,
            description: 'A test role',
            permissions: ['read:users'],
            isActive: true,
        });
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('success');
        expect(res.body.data.name).toBe(testRoleName);
        roleId = res.body.data.id;
    });
    it('should get all roles', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/roles')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.some((role) => role.id === roleId)).toBe(true);
    });
    it('should get a role by id', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .get(`/api/v1/roles/${roleId}`)
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.id).toBe(roleId);
    });
    it('should update a role', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .put(`/api/v1/roles/${roleId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ description: 'Updated description', isActive: false });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.description).toBe('Updated description');
        expect(res.body.data.isActive).toBe(false);
    });
    it('should delete a role', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/roles/${roleId}`)
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(204);
    });
});
