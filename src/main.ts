import rateLimit from 'express-rate-limit';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { TransformInterceptor } from './interceptor/transform.interceptor';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from './pipe/validate.pipe';

let app: NestExpressApplication;

async function createApp() {
  if (!app) {
    app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.setGlobalPrefix('/api');
    app.useGlobalFilters(new HttpExceptionFilter());
    app.enableCors();
    // 全局注册拦截器
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalPipes(new ValidationPipe());
    app.set('trust proxy', 1);
    app.use(
      rateLimit({
        windowMs: 15 * 60 * 1000, // 15分钟
        max: 1000, // 限制15分钟内最多只能访问1000次
      }),
    );
    await app.init();
  }
  return app;
}

// Vercel serverless 模式
export default async function handler(req: any, res: any) {
  const app = await createApp();
  const expressApp = app.getHttpAdapter().getInstance();
  return expressApp(req, res);
}

// 传统服务器模式（本地开发）
async function bootstrap() {
  const app = await createApp();
  await app.listen(process.env.PORT || 3000);
}

// 仅在非 serverless 环境下运行
if (require.main === module) {
  bootstrap();
}
