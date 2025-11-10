import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { isValidObjectId } from 'mongoose';
import { IsLogin, NoAuth } from 'src/common/decorator/customize';
import { TokenName } from 'src/constant/token-name';
import { ErrorModal, SuccessModal } from 'src/Model/Response.modal';
import { TokenService } from 'src/modules/users/services/token.service';
import { Ispeak } from '../schema/ispeak.schema';
import { IspeakService } from '../service/ispeak.service';
import { CloudinaryService } from 'src/common/cloudinary/cloudinary.service';
import { CreateIspeakDto } from '../dto/create-ispeak.dto';
import { UpdateIspeakDto } from '../dto/update-ispeak.dto';

@Controller('/ispeak')
export class IspeakController {
  constructor(
    private readonly ispeakService: IspeakService,
    private readonly tokenService: TokenService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  @IsLogin()
  @Get('/')
  async getSpeakByPage(@Request() req, @Query() query) {
    const { author } = query;
    let { page = 1, pageSize = 10 } = query;
    if (!author) return new ErrorModal(null, '需要指定查询的用户');
    const type = ['0', '1'];
    if (req?.user?.userId && req?.user?.userId === author) {
      type.push('2');
    }
    try {
      page = Number(page);
      pageSize = Number(pageSize);
    } catch (error) {
      return new ErrorModal(null, '请传入正确的参数');
    }
    const result = await this.ispeakService.getSpeakByPage(page, pageSize, {
      author,
      type,
    });
    const returnObj = {
      total: 0,
      items: [],
      isLogin: req.user && req.user.userId ? req.user.userId : null,
    };
    result.forEach((res) => {
      returnObj.total = res.total ? res.total[0]?.total : 0;
      res.items.forEach((item) => {
        item.author = item.author
          ? {
            nickName: item.author[0].nickName,
            avatar: item.author[0].avatar,
          }
          : { nickName: '', avatar: '' };
        item.tag = item.tag || {};
        if (item.type === '0') {
          returnObj.items.push(item);
        } else if (item.type === '1') {
          if (req.user && req.user.userId) {
            returnObj.items.push(item);
          } else {
            returnObj.items.push({
              _id: item._id,
              updatedAt: item.updatedAt,
              createdAt: item.createdAt,
              author: item.author,
              type: '1',
              content: '该内容需登录后查看',
              title: '',
            });
          }
        } else if (item.type === '2') {
          if (req.user && req.user.userId && req.user.userId === author) {
            returnObj.items.push(item);
          } else {
            returnObj.items.push({
              _id: item._id,
              updatedAt: item.updatedAt,
              createdAt: item.createdAt,
              type: '2',
              content: '该内容仅作者可见',
              title: '',
            });
          }
        }
      });
    });

    return new SuccessModal(returnObj);
  }

  @Get('/getByPage')
  async getIspeakByPage(@Query() query, @Request() req) {
    const { page, pageSize, _t, ...otherQuery } = query;
    const queryOptions = otherQuery;
    queryOptions['author'] = queryOptions.author || req.user.userId;

    const result = await this.ispeakService.getSpeakByPage(
      Number(page),
      Number(pageSize),
      queryOptions,
    );
    const returnObj = {
      total: 0,
      items: [],
    };
    if (result.length > 0) {
      result.forEach((item) => {
        if (item.total.length > 0) {
          returnObj.total += item.total[0].total;
          returnObj.items.push(...item.items);
        }
      });
    }
    return new SuccessModal(returnObj);
  }

  /**
   * 添加一条 speak（支持多图上传）
   * @param req 请求对象
   * @param body 请求体
   * @param files 上传的文件（最多9张）
   * @returns
   */
  @IsLogin()
  @Post('/add')
  @UseInterceptors(
    FilesInterceptor('images', 9, {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
      },
      fileFilter: (req, file, callback) => {
        // 验证文件类型
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return callback(
            new BadRequestException(
              '只支持图片文件 (jpg, jpeg, png, gif, webp)',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async addOneSpeak(
    @Request() req,
    @Body() body: CreateIspeakDto,
    @UploadedFiles() files: any[],
  ) {
    const userId = req.user.userId;
    const { title, content, type, tag, showComment } = body;

    // 验证 tag 是否为有效的 ObjectId
    if (!isValidObjectId(tag)) {
      return new ErrorModal(null, '请传入标签的id');
    }

    let images = [];
    try {
      // 如果有文件上传，则上传到 Cloudinary
      if (files && files.length > 0) {
        const uploadResults = await this.cloudinaryService.uploadMultipleFiles(
          files,
        );
        images = uploadResults.map((result) => result.url);
      }

      // 创建 speak 记录
      const result = await this.ispeakService.addOneSpeak({
        title,
        content,
        type,
        tag,
        showComment,
        author: userId,
        images, // 添加图片数据
      });

      return new SuccessModal(result);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 通过 token 添加一条 speak（支持多图上传）
   * @param body 请求体
   * @param files 上传的文件（最多9张）
   * @returns
   */
  @NoAuth()
  @Post('/addByToken')
  @UseInterceptors(
    FilesInterceptor('images', 9, {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
      },
      fileFilter: (req, file, callback) => {
        // 验证文件类型
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return callback(
            new BadRequestException(
              '只支持图片文件 (jpg, jpeg, png, gif, webp)',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async addOneSpeakByToken(
    @Body() body: Ispeak,
    @UploadedFiles() files: any[],
  ) {
    const { title, content, type, tag, showComment } = body;
    const token = body['token'];
    const user = await this.tokenService.getOneToken({ title: TokenName.Speak, value: token });
    if (!user) return new ErrorModal(null, '此token不存在');
    if (!isValidObjectId(tag)) return new ErrorModal(null, '请传入标签的id');

    let images = [];
    try {
      // 如果有文件上传，则上传到 Cloudinary
      if (files && files.length > 0) {
        const uploadResults = await this.cloudinaryService.uploadMultipleFiles(
          files,
        );
        images = uploadResults.map((result) => result.url);
      }

      // 创建 speak 记录
      const result = await this.ispeakService.addOneSpeak({
        title,
        content,
        type,
        tag,
        showComment,
        author: user.user,
        images, // 添加图片数据
      });

      return new SuccessModal(result);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 更新一条 speak（支持多图上传和通过 body 传递 images）
   * @param req 请求对象
   * @param body 请求体
   * @param files 上传的文件（最多9张）
   * @returns
   */
  @IsLogin()
  @Patch('/update')
  @UseInterceptors(
    FilesInterceptor('images', 9, {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
      },
      fileFilter: (req, file, callback) => {
        // 验证文件类型
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return callback(
            new BadRequestException(
              '只支持图片文件 (jpg, jpeg, png, gif, webp)',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async updateSpeak(
    @Body() body: UpdateIspeakDto,
    @Request() req,
    @UploadedFiles() files: any[],
  ) {
    const { _id, ...updateData } = body;
    const updateAuthor = req.user.userId;

    // 验证 _id 是否为有效的 ObjectId
    if (!isValidObjectId(_id)) {
      return new ErrorModal(null, '请传入有效的speak id');
    }

    try {
      // 如果有文件上传，则上传到 Cloudinary
      if (files && files.length > 0) {
        const uploadResults = await this.cloudinaryService.uploadMultipleFiles(
          files,
        );
        const uploadedImages = uploadResults.map((result) => result.url);

        // 如果 body 中也有 images，合并两者；否则使用上传的图片
        if (updateData.images && Array.isArray(updateData.images)) {
          updateData.images = [...updateData.images, ...uploadedImages];
        } else {
          updateData.images = uploadedImages;
        }
      }

      const res = await this.ispeakService.findOneAndUpdate(
        { _id, author: updateAuthor },
        updateData,
      );

      if (res.acknowledged && res.modifiedCount === 1) {
        return new SuccessModal(res, '更新成功');
      } else {
        if (res.matchedCount === 0) {
          return new ErrorModal(res, '没有找到对应speak');
        } else {
          return new ErrorModal(res, '更新失败');
        }
      }
    } catch (error) {
      throw error;
    }
  }

  @Patch('/status/')
  async updateSpeakStatus(@Body() body, @Request() req) {
    // eslint-disable-next-line prefer-const
    let { _id, showComment } = body;
    const updateAuthor = req.user.userId;
    const result = await this.ispeakService.findOneAndUpdate(
      { _id, author: updateAuthor },
      { showComment },
    );
    if (result.acknowledged && result.modifiedCount === 1) {
      return new SuccessModal(result, '更新成功');
    } else {
      if (result.matchedCount === 0) {
        return new ErrorModal(result, '没有找到对应speak');
      } else {
        return new ErrorModal(result, '更新失败');
      }
    }
  }

  @Delete('/:id')
  async deleteOneSpeak(@Param() param) {
    if (!param.id || !isValidObjectId(param?.id)) return new ErrorModal(null, 'id不合法');

    try {
      // 先查找要删除的 ISpeak，获取图片信息
      const speakToDelete = await this.ispeakService.findOne({ _id: param.id });

      if (!speakToDelete || speakToDelete.length === 0) {
        return new ErrorModal(null, '未找到对应的 ISpeak');
      }

      const speak = speakToDelete[0];

      // 如果有图片，先删除 Cloudinary 中的图片
      if (speak.images && Array.isArray(speak.images) && speak.images.length > 0) {
        try {
          const publicIds = this.cloudinaryService.extractPublicIdsFromImages(speak.images);
          if (publicIds.length > 0) {
            await this.cloudinaryService.deleteMultipleFiles(publicIds);
          }
        } catch (error) {
          // 即使删除图片失败，也继续删除数据库记录，但记录错误
          console.error('删除 Cloudinary 图片失败:', error);
        }
      }

      // 删除数据库记录
      const res = await this.ispeakService.findOneAndDelete({ _id: param.id });
      return new SuccessModal(res, '删除成功');
    } catch (error) {
      return new ErrorModal(null, `删除失败: ${error.message}`);
    }
  }

  @NoAuth()
  @Get('/get/:id')
  async getOneSpeak1(@Param() param) {
    const res = await this.ispeakService.findOne({ _id: param.id });
    return new SuccessModal(res.length ? res[0] : []);
  }
}
