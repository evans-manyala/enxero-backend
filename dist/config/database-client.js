"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const environment_1 = __importDefault(require("./environment"));
// Global instance to prevent multiple connections
let prisma;
if (process.env.NODE_ENV === 'production') {
    prisma = new client_1.PrismaClient({
        datasources: {
            db: {
                url: environment_1.default.DATABASE_URL,
            },
        },
        log: ['error', 'warn'],
    });
}
else {
    if (!global.__prisma) {
        global.__prisma = new client_1.PrismaClient({
            datasources: {
                db: {
                    url: environment_1.default.DATABASE_URL,
                },
            },
            log: ['query', 'info', 'warn', 'error'],
        });
    }
    prisma = global.__prisma;
}
exports.default = prisma;
