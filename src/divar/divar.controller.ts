import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { DivarService } from './divar.service';

@Controller('divar')
export class DivarController {
  constructor(private readonly divarService: DivarService) {}

  @Get('search')
  async search(@Query('city') city: string, @Query('q') q: string) {
    if (!city || !q) return { error: 'city and query parameters are required' };
    return this.divarService.collectAds(city, q);
  }

  @Post('login')
  async login(@Body() body: { phone: string }) {
    console.log('body:', body);
    return this.divarService.login(body);
  }
}
