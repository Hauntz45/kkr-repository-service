import { Module } from '@nestjs/common';
import { SpiderService } from './spider.service';

@Module({
  providers: [SpiderService],
  exports: [SpiderService],
})
export class SpiderModule {}
