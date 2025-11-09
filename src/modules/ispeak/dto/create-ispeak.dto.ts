import { IsString, IsOptional, IsNotEmpty, IsArray } from 'class-validator';

export class CreateIspeakDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsNotEmpty({ message: '内容为必填项目哦！' })
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsNotEmpty({ message: '标签为必填项目' })
  @IsString()
  tag: string;

  @IsOptional()
  @IsString()
  showComment?: string;

  @IsOptional()
  @IsArray()
  images?: string[];
}

