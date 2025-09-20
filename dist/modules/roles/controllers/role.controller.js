"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleController = void 0;
const role_service_1 = require("../services/role.service");
class RoleController {
    constructor() {
        this.roleService = new role_service_1.RoleService();
    }
    async createRole(req, res) {
        try {
            const role = await this.roleService.createRole(req.body);
            res.status(201).json({ status: 'success', data: role });
        }
        catch (error) {
            res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message,
            });
        }
    }
    async getRoles(req, res) {
        try {
            const roles = await this.roleService.getRoles();
            res.json({ status: 'success', data: roles });
        }
        catch (error) {
            res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message,
            });
        }
    }
    async getRoleById(req, res) {
        try {
            const role = await this.roleService.getRoleById(req.params.id);
            res.json({ status: 'success', data: role });
        }
        catch (error) {
            res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message,
            });
        }
    }
    async updateRole(req, res) {
        try {
            const role = await this.roleService.updateRole(req.params.id, req.body);
            res.json({ status: 'success', data: role });
        }
        catch (error) {
            res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message,
            });
        }
    }
    async deleteRole(req, res) {
        try {
            await this.roleService.deleteRole(req.params.id);
            res.status(204).send();
        }
        catch (error) {
            res.status(error.statusCode || 500).json({
                status: 'error',
                message: error.message,
            });
        }
    }
}
exports.RoleController = RoleController;
