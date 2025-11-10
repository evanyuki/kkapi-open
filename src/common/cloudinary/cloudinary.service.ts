import { Injectable, BadRequestException } from '@nestjs/common';
import {
  UploadApiResponse,
  UploadApiErrorResponse,
  v2 as cloudinary,
} from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import * as streamifier from 'streamifier';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  resourceType: string;
}

@Injectable()
export class CloudinaryService {
  private folder: string;

  constructor(private configService: ConfigService) {
    this.folder = this.configService.get<string>(
      'CLOUDINARY_FOLDER',
      'ispeak/images',
    );
  }

  /**
   * 上传单个文件到 Cloudinary
   * @param file Express.Multer.File
   * @returns CloudinaryUploadResult
   */
  async uploadFile(file: any): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      // 检测是否为 HEIC/HEIF 格式，需要转换为更兼容的格式
      const isHeicFormat = file.mimetype?.match(/\/(heic|heif)$/i);
      
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: this.folder,
          resource_type: 'auto',
          // 可选配置
          transformation: [
            { width: 2000, height: 2000, crop: 'limit' }, // 限制最大尺寸
            { quality: 'auto:good' }, // 自动优化质量
            // HEIC 格式自动转换为 JPEG 以确保浏览器兼容性
            { fetch_format: isHeicFormat ? 'jpg' : 'auto' }, // 自动选择最佳格式
          ],
        },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) {
            reject(new BadRequestException(`图片上传失败: ${error.message}`));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            resourceType: result.resource_type,
          });
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * 批量上传文件
   * @param files Express.Multer.File[]
   * @returns CloudinaryUploadResult[]
   */
  async uploadMultipleFiles(
    files: any[],
  ): Promise<CloudinaryUploadResult[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file));
    return Promise.all(uploadPromises);
  }

  /**
   * 删除 Cloudinary 图片
   * @param publicId 图片的 public_id
   * @returns 删除结果
   */
  async deleteFile(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      throw new BadRequestException(`删除图片失败: ${error.message}`);
    }
  }

  /**
   * 批量删除图片
   * @param publicIds 图片 public_id 数组
   * @returns 删除结果
   */
  async deleteMultipleFiles(publicIds: string[]): Promise<any[]> {
    const deletePromises = publicIds.map((publicId) =>
      this.deleteFile(publicId),
    );
    return Promise.all(deletePromises);
  }

  /**
   * 从 Cloudinary URL 中提取 publicId
   * @param url Cloudinary 图片 URL
   * @returns publicId 或 null
   */
  extractPublicIdFromUrl(url: string): string | null {
    if (!url || typeof url !== 'string') {
      return null;
    }

    try {
      // Cloudinary URL 格式示例:
      // https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/v{version}/{folder}/{public_id}.{format}
      // https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{transformations}/v{version}/{folder}/{public_id}.{format}
      // https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{folder}/{public_id}.{format}

      // 使用更简单的方法：找到最后一个斜杠和文件扩展名之间的内容
      // 但需要排除转换参数和版本号

      // 匹配 /upload/ 之后的内容
      const uploadMatch = url.match(/\/upload\/(.+)$/);
      if (!uploadMatch || !uploadMatch[1]) {
        return null;
      }

      let pathAfterUpload = uploadMatch[1];

      // 移除版本号 (v1234567890/)
      pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');

      // 移除转换参数
      // 转换参数通常格式为: w_500,h_500,c_fill/ 或类似格式
      // 匹配包含下划线、逗号、等号的转换参数段
      const transformationPattern = /^[a-z0-9_,=\-]+\//i;
      while (transformationPattern.test(pathAfterUpload)) {
        pathAfterUpload = pathAfterUpload.replace(transformationPattern, '');
      }

      // 移除文件扩展名（最后一个点之后的内容）
      const publicId = pathAfterUpload.replace(/\.[^.]+$/, '');

      // 如果 publicId 为空或只包含斜杠，返回 null
      if (!publicId || publicId.trim() === '' || publicId === '/') {
        return null;
      }

      return `${this.folder}/${publicId}`;
    } catch (error) {
      console.error('提取 publicId 失败:', error);
      return null;
    }
  }

  /**
   * 从图片数组（可能是 URL 字符串数组或对象数组）中提取 publicId 数组
   * @param images 图片数组，可能是字符串数组（URL）或对象数组（包含 publicId 或 url）
   * @returns publicId 数组
   */
  extractPublicIdsFromImages(images: any[]): string[] {
    if (!images || !Array.isArray(images) || images.length === 0) {
      return [];
    }

    return images
      .map((image) => {
        // 如果是字符串，直接提取 publicId
        if (typeof image === 'string') {
          return this.extractPublicIdFromUrl(image);
        }
        // 如果是对象，优先使用 publicId，否则从 url 提取
        if (typeof image === 'object' && image !== null) {
          return image.publicId || (image.url ? this.extractPublicIdFromUrl(image.url) : null);
        }
        return null;
      })
      .filter((publicId): publicId is string => publicId !== null);
  }
}

