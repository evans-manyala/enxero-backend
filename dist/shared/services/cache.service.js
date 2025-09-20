"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
let CacheService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var CacheService = _classThis = class {
        constructor(configService) {
            this.configService = configService;
            this.defaultTTL = 3600; // 1 hour in seconds
            this.redis = new ioredis_1.Redis({
                host: this.configService.get('REDIS_HOST', 'localhost'),
                port: this.configService.get('REDIS_PORT', 6379),
                password: this.configService.get('REDIS_PASSWORD'),
                db: this.configService.get('REDIS_DB', 0),
            });
        }
        // Payroll Caching Methods
        async getPayrollConfig(companyId) {
            const key = `payroll:config:${companyId}`;
            const cached = await this.redis.get(key);
            return cached ? JSON.parse(cached) : null;
        }
        async setPayrollConfig(companyId, config) {
            const key = `payroll:config:${companyId}`;
            await this.redis.set(key, JSON.stringify(config), 'EX', this.defaultTTL);
        }
        async getPayrollPeriod(companyId, periodId) {
            const key = `payroll:period:${companyId}:${periodId}`;
            const cached = await this.redis.get(key);
            return cached ? JSON.parse(cached) : null;
        }
        async setPayrollPeriod(companyId, periodId, period) {
            const key = `payroll:period:${companyId}:${periodId}`;
            await this.redis.set(key, JSON.stringify(period), 'EX', this.defaultTTL);
        }
        async getEmployeePayroll(employeeId, periodId) {
            const key = `payroll:employee:${employeeId}:${periodId}`;
            const cached = await this.redis.get(key);
            return cached ? JSON.parse(cached) : null;
        }
        async setEmployeePayroll(employeeId, periodId, payroll) {
            const key = `payroll:employee:${employeeId}:${periodId}`;
            await this.redis.set(key, JSON.stringify(payroll), 'EX', this.defaultTTL);
        }
        // Leave Management Caching Methods
        async getLeaveBalance(employeeId, year) {
            const key = `leave:balance:${employeeId}:${year}`;
            const cached = await this.redis.get(key);
            return cached ? JSON.parse(cached) : null;
        }
        async setLeaveBalance(employeeId, year, balance) {
            const key = `leave:balance:${employeeId}:${year}`;
            await this.redis.set(key, JSON.stringify(balance), 'EX', this.defaultTTL);
        }
        async getLeaveTypes(companyId) {
            const key = `leave:types:${companyId}`;
            const cached = await this.redis.get(key);
            return cached ? JSON.parse(cached) : null;
        }
        async setLeaveTypes(companyId, types) {
            const key = `leave:types:${companyId}`;
            await this.redis.set(key, JSON.stringify(types), 'EX', this.defaultTTL);
        }
        async getLeaveRequests(employeeId, status) {
            const key = `leave:requests:${employeeId}:${status || 'all'}`;
            const cached = await this.redis.get(key);
            return cached ? JSON.parse(cached) : null;
        }
        async setLeaveRequests(employeeId, requests, status) {
            const key = `leave:requests:${employeeId}:${status || 'all'}`;
            await this.redis.set(key, JSON.stringify(requests), 'EX', this.defaultTTL);
        }
        // Generic Cache Methods
        async get(key) {
            const cached = await this.redis.get(key);
            return cached ? JSON.parse(cached) : null;
        }
        async set(key, value, ttl) {
            await this.redis.set(key, JSON.stringify(value), 'EX', ttl || this.defaultTTL);
        }
        async delete(key) {
            await this.redis.del(key);
        }
        async deletePattern(pattern) {
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        }
        // Cache Invalidation Methods
        async invalidatePayrollCache(companyId) {
            await this.deletePattern(`payroll:*:${companyId}:*`);
        }
        async invalidateEmployeePayrollCache(employeeId) {
            await this.deletePattern(`payroll:employee:${employeeId}:*`);
        }
        async invalidateLeaveCache(employeeId) {
            await this.deletePattern(`leave:*:${employeeId}:*`);
        }
        async invalidateCompanyLeaveCache(companyId) {
            await this.deletePattern(`leave:*:${companyId}:*`);
        }
    };
    __setFunctionName(_classThis, "CacheService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CacheService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CacheService = _classThis;
})();
exports.CacheService = CacheService;
