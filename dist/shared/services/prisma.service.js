"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const client_1 = require("@prisma/client");
class PrismaService {
    static getInstance() {
        if (!PrismaService.instance) {
            PrismaService.instance = new client_1.PrismaClient();
        }
        return PrismaService.instance;
    }
    getClient() {
        return PrismaService.getInstance();
    }
}
exports.PrismaService = PrismaService;
