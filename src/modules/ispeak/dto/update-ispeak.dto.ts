import { IsString, IsOptional, IsArray, IsMongoId } from 'class-validator';

export class UpdateIspeakDto {
  @IsMongoId({ message: '请传入有效的speak id' })
  _id: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  showComment?: string;

  @IsOptional()
  @IsArray()
  images?: string[];
}

