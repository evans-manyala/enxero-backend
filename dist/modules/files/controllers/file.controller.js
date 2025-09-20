"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileController = void 0;
const file_service_1 = require("../services/file.service");
const AppError_1 = require("../../../shared/utils/AppError");
const http_status_1 = require("../../../shared/utils/http-status");
class FileController {
    constructor() {
        this.listFiles = async (req, res) => {
            try {
                const { page = 1, limit = 10, search, entityType, entityId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
                const result = await this.service.listFiles({
                    page: Number(page),
                    limit: Number(limit),
                    search: search,
                    entityType: entityType,
                    entityId: entityId,
                    sortBy: sortBy,
                    sortOrder: sortOrder,
                });
                res.status(http_status_1.HttpStatus.OK).json({
                    status: 'success',
                    data: result.data,
                    meta: result.meta
                });
            }
            catch (error) {
                if (error instanceof AppError_1.AppError) {
                    res.status(error.statusCode).json({ message: error.message });
                }
                else {
                    res.status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
                }
            }
        };
        this.getFileMetadata = async (req, res) => {
            try {
                const { id } = req.params;
                const file = await this.service.getFileMetadata(id);
                res.status(http_status_1.HttpStatus.OK).json({ status: 'success', data: file });
            }
            catch (error) {
                if (error instanceof AppError_1.AppError) {
                    res.status(error.statusCode).json({ message: error.message });
                }
                else {
                    res.status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
                }
            }
        };
        this.downloadFile = async (req, res) => {
            try {
                const { id } = req.params;
                const fileStream = await this.service.downloadFile(id);
                if (!fileStream) {
                    throw new AppError_1.AppError('File not found', http_status_1.HttpStatus.NOT_FOUND);
                }
                fileStream.pipe(res);
            }
            catch (error) {
                if (error instanceof AppError_1.AppError) {
                    res.status(error.statusCode).json({ message: error.message });
                }
                else {
                    res.status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
                }
            }
        };
        this.uploadFile = async (req, res) => {
            try {
                const mReq = req;
                const file = mReq.file;
                if (!file) {
                    throw new AppError_1.AppError('No file uploaded', http_status_1.HttpStatus.BAD_REQUEST);
                }
                const { description, tags, entityType, entityId } = req.body;
                const uploaded = await this.service.uploadFile({ file, description, tags, entityType, entityId });
                res.status(http_status_1.HttpStatus.CREATED).json({ status: 'success', data: uploaded });
            }
            catch (error) {
                if (error instanceof AppError_1.AppError) {
                    res.status(error.statusCode).json({ message: error.message });
                }
                else {
                    res.status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
                }
            }
        };
        this.deleteFile = async (req, res) => {
            try {
                const { id } = req.params;
                await this.service.deleteFile(id);
                res.status(http_status_1.HttpStatus.NO_CONTENT).send();
            }
            catch (error) {
                if (error instanceof AppError_1.AppError) {
                    res.status(error.statusCode).json({ message: error.message });
                }
                else {
                    res.status(http_status_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
                }
            }
        };
        this.service = new file_service_1.FileService();
    }
}
exports.FileController = FileController;
