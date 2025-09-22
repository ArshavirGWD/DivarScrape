import { Module } from '@nestjs/common';
import { DivarService } from './divar.service';
import { DivarController } from './divar.controller';

@Module({
  providers: [DivarService],
  controllers: [DivarController]
})
export class DivarModule {}
