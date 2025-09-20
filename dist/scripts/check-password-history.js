"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const logger_1 = __importDefault(require("../shared/utils/logger"));
const prisma = new client_1.PrismaClient();
async function checkPasswordHistory() {
    try {
        const userId = 'a7e84a51-46bf-49eb-a205-8c9dde7d9eb2';
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                passwordHistory: true
            }
        });
        logger_1.default.info('Password history check result:', {
            found: !!user,
            userId: user?.id,
            email: user?.email,
            rawPasswordHistory: user?.passwordHistory
        });
    }
    catch (error) {
        logger_1.default.error('Error checking password history:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
checkPasswordHistory();
