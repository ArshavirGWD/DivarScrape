import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DivarModule } from './divar/divar.module';

@Module({
  imports: [DivarModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
