import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as https from 'https'; // <--- 1. NEW IMPORT
import { CompaniesService } from '../companies/companies.service';
import { KKRResponse, KKRPortfolioItem } from './types';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly BASE_URL = 'https://www.kkr.com/content/kkr/sites/global/en/invest/portfolio/jcr:content/root/main-par/bioportfoliosearch.bioportfoliosearch.json';

  constructor(private readonly companiesService: CompaniesService) {}

  async scrapeAll(): Promise<{ message: string; total: number }> {
    this.logger.log('Starting KKR Portfolio Scrape...');
    
    // <--- 2. NEW AGENT: Ignore SSL errors caused by corporate proxy
    const httpsAgent = new https.Agent({  
      rejectUnauthorized: false
    });

    let currentPage = 1;
    let totalPages = 1;
    let totalProcessed = 0;

    do {
      try {
        this.logger.log(`Fetching page ${currentPage}...`);
        
        const response = await axios.get<KKRResponse>(this.BASE_URL, {
          params: {
            page: currentPage,
            sortParameter: 'name',
            sortingOrder: 'asc',
          },
          httpsAgent: httpsAgent, // <--- 3. APPLY THE FIX HERE
        });

        const data = response.data;
        
        // Update total pages dynamically
        if (data.pages) {
            totalPages = data.pages;
        }

        if (data.results && data.results.length > 0) {
          await this.processBatch(data.results);
          totalProcessed += data.results.length;
          this.logger.log(`Page ${currentPage} processed. (${data.results.length} companies)`);
        }

        currentPage++;
      } catch (error) {
        this.logger.error(`Error scraping page ${currentPage}: ${error.message}`);
        // If we fail on page 1, it's likely a network issue, so we stop.
        if (currentPage === 1) break;
      }
    } while (currentPage <= totalPages);

    this.logger.log(`Scraping complete. Processed ${totalProcessed} companies.`);
    return { message: 'Scraping complete', total: totalProcessed };
  }

  private async processBatch(items: KKRPortfolioItem[]): Promise<void> {
    for (const item of items) {
      // Clean HTML from description
      const cleanDescription = this.cleanHtml(item.description);
      // Parse year, handle empty strings
      const year = item.yoi ? parseInt(item.yoi, 10) : undefined;

      await this.companiesService.createOrUpdate({
        name: item.name,
        industry: item.industry,
        assetClass: item.assetClass,
        region: item.region,
        hqLocation: item.hq,
        description: cleanDescription,
        website: item.url,
        yearOfInvestment: year,
        logoUrl: item.logo,
      });
    }
  }

  private cleanHtml(html: string): string {
    if (!html) return '';
    const $ = cheerio.load(html);
    return $.text().trim();
  }
}
