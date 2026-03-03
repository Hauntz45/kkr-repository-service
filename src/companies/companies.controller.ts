import { Controller, Get, Delete, Query, Param, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Parser } from 'json2csv';
import { CompaniesService } from './companies.service';

@ApiTags('Companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve all portfolio companies' })
  @ApiResponse({
    status: 200,
    description: 'List of companies with AI enrichment data.',
  })
  findAll() {
    return this.companiesService.findAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search companies by name' })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Partial name to search for (e.g., "Dentist")',
  })
  @ApiResponse({ status: 200, description: 'Filtered list of companies.' })
  search(@Query('q') query: string) {
    return this.companiesService.search(query);
  }

  @Get('export')
  @ApiOperation({ summary: 'Download Portfolio as CSV' })
  @ApiResponse({
    status: 200,
    description: 'Streamed CSV file download suitable for Excel/Tableau.',
  })
  async exportCsv(@Res() res: Response) {
    const companies = await this.companiesService.findAll();

    // Define CSV Columns (Flattened structure)
    const fields = [
      'name',
      'industry',
      'region',
      'yearOfInvestment',
      'aiAnalysis.summary',
      'aiAnalysis.tags',
      'websiteData.isAlive',
      'websiteData.title',
    ];

    const json2csv = new Parser({ fields });
    const csv = json2csv.parse(companies);

    // Set headers to trigger browser download
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename=kkr_portfolio.csv');
    return res.send(csv);
  }

  @Delete(':name')
  @ApiOperation({ summary: 'Delete a company by name (Testing Utility)' })
  @ApiParam({
    name: 'name',
    required: true,
    description: 'Exact name of the company to delete' 
  })
  @ApiResponse({ status: 200, description: 'Record deleted successfully.' })
  remove(@Param('name') name: string) {
    return this.companiesService.remove(name);
  }
}
