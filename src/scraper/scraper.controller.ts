import { Controller, Post, Get } from '@nestjs/common';
import { ScraperService } from './scraper.service';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post('sync')
  async triggerScrape() {
    return this.scraperService.scrapeAll();
  }
}
