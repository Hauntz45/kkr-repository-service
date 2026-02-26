import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [CompaniesModule], // Import this to access CompaniesService
  controllers: [ScraperController],
  providers: [ScraperService],
})
export class ScraperModule {}
