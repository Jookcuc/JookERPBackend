import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UseKeysController } from './use-keys.controller';
import { UseKeysService } from './use-keys.service';
import { UserKey } from '../auth/entities/user-key.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserKey])],
  controllers: [UseKeysController],
  providers: [UseKeysService],
  exports: [UseKeysService],
})
export class UseKeysModule {}