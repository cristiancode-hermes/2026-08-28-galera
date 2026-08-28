import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ALL_ENTITIES } from '../entities/entities';
import { StudioService } from './studio.service';
import { StudioController } from './studio.controller';
import { StaffController } from './staff.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature(ALL_ENTITIES), AuthModule],
  controllers: [StudioController, StaffController],
  providers: [StudioService],
  exports: [StudioService],
})
export class StudioModule {}
