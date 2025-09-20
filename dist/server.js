"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const environment_1 = __importDefault(require("./config/environment"));
const logger_1 = __importDefault(require("./shared/utils/logger"));
const server = app_1.default.listen(environment_1.default.PORT, () => {
    logger_1.default.info(`Server running on port ${environment_1.default.PORT}`);
});
// server.on('error', (error: NodeJS.ErrnoException) => {
server.on('error', (error) => {
    if (error.syscall !== 'listen') {
        throw error;
    }
    const bind = typeof environment_1.default.PORT === 'string' ? `Pipe ${environment_1.default.PORT}` : `Port ${environment_1.default.PORT}`;
    switch (error.code) {
        case 'EACCES':
            logger_1.default.error(`${bind} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            logger_1.default.error(`${bind} is already in use`);
            process.exit(1);
            break;
        default:
            throw error;
    }
});
process.on('unhandledRejection', (error) => {
    logger_1.default.error('Unhandled Rejection:', error);
    server.close(() => process.exit(1));
});
process.on('uncaughtException', (error) => {
    logger_1.default.error('Uncaught Exception:', error);
    server.close(() => process.exit(1));
});
exports.default = server;
