import { Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ScraperService } from './scraper.service';

@ApiTags('Scraper')
@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post('sync')
  @ApiOperation({ summary: 'Trigger the ETL pipeline' })
  @ApiResponse({
    status: 201,
    description:
      'Scraping process initiated. Returns summary of processed items.',
  })
  async triggerScrape() {
    return this.scraperService.scrapeAll();
  }
}
