import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ALL_ENTITIES } from '../entities/entities';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { StudioModule } from '../studio/studio.module';

@Module({
  imports: [TypeOrmModule.forFeature(ALL_ENTITIES), StudioModule],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
