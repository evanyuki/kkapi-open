"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryService = void 0;
const common_1 = require("@nestjs/common");
const cloudinary_1 = require("cloudinary");
const config_1 = require("@nestjs/config");
const streamifier = require("streamifier");
let CloudinaryService = class CloudinaryService {
    configService;
    folder;
    constructor(configService) {
        this.configService = configService;
        this.folder = this.configService.get('CLOUDINARY_FOLDER', 'ispeak/images');
    }
    async uploadFile(file) {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                folder: this.folder,
                resource_type: 'auto',
                transformation: [
                    { width: 2000, height: 2000, crop: 'limit' },
                    { quality: 'auto:good' },
                    { fetch_format: 'auto' },
                ],
            }, (error, result) => {
                if (error) {
                    reject(new common_1.BadRequestException(`图片上传失败: ${error.message}`));
                }
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                    width: result.width,
                    height: result.height,
                    format: result.format,
                    resourceType: result.resource_type,
                });
            });
            streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });
    }
    async uploadMultipleFiles(files) {
        const uploadPromises = files.map((file) => this.uploadFile(file));
        return Promise.all(uploadPromises);
    }
    async deleteFile(publicId) {
        try {
            const result = await cloudinary_1.v2.uploader.destroy(publicId);
            return result;
        }
        catch (error) {
            throw new common_1.BadRequestException(`删除图片失败: ${error.message}`);
        }
    }
    async deleteMultipleFiles(publicIds) {
        const deletePromises = publicIds.map((publicId) => this.deleteFile(publicId));
        return Promise.all(deletePromises);
    }
    extractPublicIdFromUrl(url) {
        if (!url || typeof url !== 'string') {
            return null;
        }
        try {
            const uploadMatch = url.match(/\/upload\/(.+)$/);
            if (!uploadMatch || !uploadMatch[1]) {
                return null;
            }
            let pathAfterUpload = uploadMatch[1];
            pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
            const transformationPattern = /^[a-z0-9_,=\-]+\//i;
            while (transformationPattern.test(pathAfterUpload)) {
                pathAfterUpload = pathAfterUpload.replace(transformationPattern, '');
            }
            const publicId = pathAfterUpload.replace(/\.[^.]+$/, '');
            if (!publicId || publicId.trim() === '' || publicId === '/') {
                return null;
            }
            return `${this.folder}/${publicId}`;
        }
        catch (error) {
            console.error('提取 publicId 失败:', error);
            return null;
        }
    }
    extractPublicIdsFromImages(images) {
        if (!images || !Array.isArray(images) || images.length === 0) {
            return [];
        }
        return images
            .map((image) => {
            if (typeof image === 'string') {
                return this.extractPublicIdFromUrl(image);
            }
            if (typeof image === 'object' && image !== null) {
                return image.publicId || (image.url ? this.extractPublicIdFromUrl(image.url) : null);
            }
            return null;
        })
            .filter((publicId) => publicId !== null);
    }
};
CloudinaryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CloudinaryService);
exports.CloudinaryService = CloudinaryService;
//# sourceMappingURL=cloudinary.service.js.map