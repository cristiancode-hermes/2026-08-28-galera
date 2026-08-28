import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StudioService } from './studio.service';
import { PatchStudioDayDto, StaffCheckInDto, StudioDayDto } from './studio.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/current-user';

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, StaffGuard)
@Controller('staff')
export class StaffController {
  constructor(private readonly studio: StudioService) {}

  @Post('studio-days')
  createDay(@Body() dto: StudioDayDto) {
    return this.studio.upsertStudioDay(dto);
  }

  @Patch('studio-days/:id')
  patchDay(@Param('id') id: string, @Body() dto: PatchStudioDayDto) {
    return this.studio.patchStudioDay(id, dto);
  }

  @Post('check-in')
  checkIn(@Body() dto: StaffCheckInDto) {
    return this.studio.stampStaff(dto.codeOrUrl);
  }

  @Get('today')
  today() {
    return this.studio.staffToday();
  }
}
