import { ConfigService } from '@nestjs/config';
export interface CloudinaryUploadResult {
    url: string;
    publicId: string;
    width: number;
    height: number;
    format: string;
    resourceType: string;
}
export declare class CloudinaryService {
    private configService;
    private folder;
    constructor(configService: ConfigService);
    uploadFile(file: any): Promise<CloudinaryUploadResult>;
    uploadMultipleFiles(files: any[]): Promise<CloudinaryUploadResult[]>;
    deleteFile(publicId: string): Promise<any>;
    deleteMultipleFiles(publicIds: string[]): Promise<any[]>;
    extractPublicIdFromUrl(url: string): string | null;
    extractPublicIdsFromImages(images: any[]): string[];
}
