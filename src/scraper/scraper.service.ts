import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as https from 'https'; // <--- 1. NEW IMPORT
import { CompaniesService } from '../companies/companies.service';
import { KKRResponse, KKRPortfolioItem } from './types';

const SLEEP_MS = 2000; // 2 seconds delay between pages (Rate Limiting)
const MAX_RETRIES = 3;

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly BASE_URL = 'https://www.kkr.com/content/kkr/sites/global/en/invest/portfolio/jcr:content/root/main-par/bioportfoliosearch.bioportfoliosearch.json';

  constructor(private readonly companiesService: CompaniesService) {}

  async scrapeAll(): Promise<{ message: string; total: number }> {
    this.logger.log('Starting KKR Portfolio Scrape (Resilient Mode)...');
    
    // Agent from previous step
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    let currentPage = 1;
    let totalPages = 1;
    let totalProcessed = 0;
    let consecutiveErrors = 0;

    do {
      try {
        // RATE LIMITING: Sleep before fetching (except first page)
        if (currentPage > 1) {
            await this.sleep(SLEEP_MS); 
        }

        this.logger.log(`Fetching page ${currentPage}...`);
        
        // RETRY MECHANISM: Wrap the request
        const data = await this.fetchWithRetry(currentPage, httpsAgent);
        
        // Reset error counter on success
        consecutiveErrors = 0;

        // Update total pages
        if (data.pages) totalPages = data.pages;

        if (data.results && data.results.length > 0) {
          await this.processBatch(data.results);
          totalProcessed += data.results.length;
          this.logger.log(`Page ${currentPage} processed. (${data.results.length} companies)`);
        }

        currentPage++;
      } catch (error) {
        this.logger.error(`Failed to process page ${currentPage} after retries.`);
        consecutiveErrors++;
        
        // Circuit Breaker: If 3 pages fail in a row, stop the scraper.
        if (consecutiveErrors >= 3) {
            this.logger.error('Too many consecutive errors. Aborting scrape.');
            break;
        }
        
        // Skip this page and try the next one
        currentPage++;
      }
    } while (currentPage <= totalPages);

    this.logger.log(`Scraping complete. Processed ${totalProcessed} companies.`);
    return { message: 'Scraping complete', total: totalProcessed };
  }

  /**
   * Helper: Retries the Axios request with exponential backoff
   */
  private async fetchWithRetry(page: number, agent: https.Agent): Promise<KKRResponse> {
    let attempt = 1;
    
    while (attempt <= MAX_RETRIES) {
      try {
        const response = await axios.get<KKRResponse>(this.BASE_URL, {
          params: { page, sortParameter: 'name', sortingOrder: 'asc' },
          httpsAgent: agent,
          timeout: 10000, // 10s timeout
        });
        return response.data;
      } catch (error) {
        if (attempt === MAX_RETRIES) throw error;
        
        const delay = 1000 * Math.pow(2, attempt); // Exponential: 2s, 4s, 8s
        this.logger.warn(`Page ${page} failed (Attempt ${attempt}). Retrying in ${delay}ms...`);
        await this.sleep(delay);
        attempt++;
      }
    }
    throw new Error(`Failed to fetch page ${page} after ${MAX_RETRIES} attempts`);
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async processBatch(items: KKRPortfolioItem[]): Promise<void> {
    for (const item of items) {
      // Clean HTML from description
      const cleanDescription = this.cleanHtml(item.description);
      // Parse year, handle empty strings
    //   const year = item.yoi ? parseInt(item.yoi, 10) : undefined;
      const year = item.yoi ? parseInt(item.yoi, 10) : null;

      await this.companiesService.createOrUpdate({
        name: item.name,
        industry: item.industry || '',
        assetClass: item.assetClass || '',
        region: item.region || '',
        hqLocation: item.hq || '',
        description: cleanDescription,
        website: item.url || '',
        // yearOfInvestment: year,
        yearOfInvestment: year as any,
        logoUrl: item.logo || '',
      });
    }
  }

  private cleanHtml(html: string): string {
    if (!html) return '';
    const $ = cheerio.load(html);
    return $.text().trim();
  }
}
