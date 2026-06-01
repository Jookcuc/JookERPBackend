import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsInt } from 'class-validator';

export class SendLeadInfoDto {
  @ApiProperty({ example: [1, 2, 3] })
  @IsArray()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  leadIds: number[];
}
