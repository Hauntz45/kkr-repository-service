import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve Portfolio Analytics & Trends' })
  @ApiResponse({
    status: 200,
    description:
      'Aggregated statistics including Industry distribution, AI Tag clouds, and Temporal Trends.',
  })
  getStats() {
    return this.analyticsService.getPortfolioStats();
  }
}
