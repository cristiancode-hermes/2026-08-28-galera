import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StudioService } from './studio.service';
import { CheckInDto, CreatePassDto, ReviewDto } from './studio.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user';
import type { AuthUser } from '../auth/current-user';

@ApiTags('studio')
@Controller()
export class StudioController {
  constructor(private readonly studio: StudioService) {}

  @Get('presses')
  presses() {
    return this.studio.listPresses();
  }

  @Get('presses/:id')
  press(@Param('id') id: string) {
    return this.studio.getPress(id);
  }

  @Get('addons')
  addons() {
    return this.studio.listAddons();
  }

  @Get('studio-days')
  days() {
    return this.studio.listStudioDays();
  }

  @Get('studio-days/today')
  today() {
    return this.studio.todayStudio();
  }

  @Post('passes')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createPass(@CurrentUser() user: AuthUser, @Body() dto: CreatePassDto) {
    return this.studio.createPass(user.userId, dto.addonIds || []);
  }

  @Get('passes')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  myPasses(@CurrentUser() user: AuthUser) {
    return this.studio.listMyPasses(user.userId);
  }

  @Get('passes/by-code/:code')
  byCode(@Param('code') code: string) {
    return this.studio.getByCode(code);
  }

  @Get('passes/:id/qr')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  qr(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.studio.qrFor(user.userId, id);
  }

  @Get('passes/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.studio.getMyPass(user.userId, id);
  }

  @Post('passes/:id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.studio.cancelPass(user.userId, id);
  }

  @Post('check-ins')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  stamp(@CurrentUser() user: AuthUser, @Body() dto: CheckInDto) {
    return this.studio.stampSelf(user.userId, dto.passId);
  }

  @Get('check-ins')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthUser) {
    return this.studio.myCheckIns(user.userId);
  }

  @Get('reviews')
  reviews(@Query('pressId') pressId?: string) {
    return this.studio.listReviews(pressId);
  }

  @Post('reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  review(@CurrentUser() user: AuthUser, @Body() dto: ReviewDto) {
    return this.studio.createReview(user.userId, dto);
  }

  @Get('stats/me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  stats(@CurrentUser() user: AuthUser) {
    return this.studio.statsMe(user.userId);
  }
}
