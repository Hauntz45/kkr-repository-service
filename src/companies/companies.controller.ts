import { Controller, Get, Delete, Query, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
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

  @Delete(':name')
  @ApiOperation({ summary: 'Delete a company by name (Testing Utility)' })
  @ApiParam({
    name: 'name',
    required: true,
    description: 'Exact name of the company to delete',
  })
  @ApiResponse({ status: 200, description: 'Record deleted successfully.' })
  remove(@Param('name') name: string) {
    return this.companiesService.remove(name);
  }
}
