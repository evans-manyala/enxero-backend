"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const environment_1 = __importDefault(require("./config/environment"));
const logger_1 = __importDefault(require("./shared/utils/logger"));
const error_middleware_1 = require("./shared/middlewares/error.middleware");
const routes_1 = __importDefault(require("./routes"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = __importDefault(require("./config/swagger"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: environment_1.default.CORS_ORIGIN }));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)('dev'));
// Rate limiting - exclude API docs
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    skip: (req) => req.path.startsWith('/api-docs'), // Skip rate limiting for API docs
    message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);
logger_1.default.debug(`Application running in ${environment_1.default.NODE_ENV} environment.`);
logger_1.default.info('Logger test message from app.ts');
app.use('/api/v1', routes_1.default);
// Serve Swagger UI with better configuration
app.use('/api-docs', swagger_ui_express_1.default.serve);
app.get('/api-docs', swagger_ui_express_1.default.setup(swagger_1.default, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Enxero Platform API Documentation',
    customfavIcon: '/favicon.ico',
}));
// Add a simple redirect from root to API docs
app.get('/', (req, res) => {
    res.redirect('/api-docs');
});
app.use(error_middleware_1.errorHandler);
exports.default = app;
