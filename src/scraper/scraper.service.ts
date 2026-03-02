import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as https from 'https';
import { CompaniesService } from '../companies/companies.service';
import { KKRResponse, KKRPortfolioItem } from './types';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly BASE_URL =
    'https://www.kkr.com/content/kkr/sites/global/en/invest/portfolio/jcr:content/root/main-par/bioportfoliosearch.bioportfoliosearch.json';

  // Resiliency Configuration
  private readonly MAX_RETRIES = 3;
  private readonly PAGE_DELAY_MS = 2000; // 2s delay to respect server rate limits

  constructor(private readonly companiesService: CompaniesService) {}

  /**
   * Orchestrates the full Extraction, Transformation, and Load (ETL) pipeline.
   *
   * Features:
   * - Pagination handling (auto-detects total pages).
   * - Circuit Breaker (stops job if too many consecutive errors).
   * - Rate Limiting (delays between requests).
   */
  async scrapeAll(): Promise<{ message: string; total: number }> {
    this.logger.log('Starting KKR Portfolio Extraction Pipeline...');

    // Agent to handle corporate proxies/SSL issues
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    let currentPage = 1;
    let totalPages = 1;
    let totalProcessed = 0;
    let consecutiveErrors = 0;

    do {
      try {
        // Rate Limiting
        if (currentPage > 1) await this.sleep(this.PAGE_DELAY_MS);

        this.logger.log(`Processing page ${currentPage}...`);

        // Fetch with Retry Logic
        const data = await this.fetchWithRetry(currentPage, httpsAgent);

        // Update state
        consecutiveErrors = 0;
        if (data.pages) totalPages = data.pages;

        // Process Batch
        if (data.results && data.results.length > 0) {
          await this.processBatch(data.results);
          totalProcessed += data.results.length;
          this.logger.log(
            `Page ${currentPage} complete. (${data.results.length} items)`,
          );
        }

        currentPage++;
      } catch (error) {
        this.logger.error(`Page ${currentPage} failed: ${error.message}`);
        consecutiveErrors++;

        // Circuit Breaker
        if (consecutiveErrors >= 3) {
          this.logger.error(
            'Circuit Breaker tripped: Too many consecutive errors. Aborting job.',
          );
          break;
        }
        currentPage++;
      }
    } while (currentPage <= totalPages);

    this.logger.log(`Job Complete. Total items: ${totalProcessed}.`);
    return { message: 'Scraping job completed', total: totalProcessed };
  }

  /**
   * Fetches data with Exponential Backoff strategy.
   * Delays: 2s -> 4s -> 8s -> Fail
   */
  private async fetchWithRetry(
    page: number,
    agent: https.Agent,
  ): Promise<KKRResponse> {
    let attempt = 1;
    while (attempt <= this.MAX_RETRIES) {
      try {
        const response = await axios.get<KKRResponse>(this.BASE_URL, {
          params: { page, sortParameter: 'name', sortingOrder: 'asc' },
          httpsAgent: agent,
          timeout: 10000,
        });
        return response.data;
      } catch (error) {
        if (attempt === this.MAX_RETRIES) throw error;
        const delay = 1000 * Math.pow(2, attempt);
        this.logger.warn(
          `Page ${page} Retry (${attempt}/${this.MAX_RETRIES}) in ${delay}ms...`,
        );
        await this.sleep(delay);
        attempt++;
      }
    }
    throw new Error(
      `Failed to fetch page ${page} after ${this.MAX_RETRIES} attempts`,
    );
  }

  private async processBatch(items: KKRPortfolioItem[]): Promise<void> {
    for (const item of items) {
      const cleanDescription = this.cleanHtml(item.description);
      const year = item.yoi ? parseInt(item.yoi, 10) : null;

      await this.companiesService.createOrUpdate({
        name: item.name,
        industry: item.industry || '',
        assetClass: item.assetClass || '',
        region: item.region || '',
        hqLocation: item.hq || '',
        description: cleanDescription,
        website: item.url || '',
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

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
