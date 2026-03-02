import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as https from 'https';

export interface WebsiteMetadata {
  title: string;
  metaDescription: string;
  isAlive: boolean;
}

/**
 * Service responsible for fetching external company metadata.
 *
 * Features:
 * - Mimics a real browser (User-Agent spoofing) to bypass basic WAFs.
 * - Handles SSL handshake errors (common in legacy corporate sites).
 * - Strict timeouts to prevent ETL pipeline bottlenecks.
 */
@Injectable()
export class SpiderService {
  private readonly logger = new Logger(SpiderService.name);

  /**
   * Fetches the Title and Meta Description from a target URL.
   * Returns empty strings if the site is unreachable or blocks the request.
   */
  async fetchMetadata(url: string): Promise<WebsiteMetadata> {
    if (!url) return { title: '', metaDescription: '', isAlive: false };

    // Normalize URL protocol
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;

    try {
      // Custom Agent: Ignores self-signed certificate errors
      const agent = new https.Agent({
        rejectUnauthorized: false,
        keepAlive: true,
      });

      // Request Configuration: Mimic Chrome on Windows to avoid 403 Forbidden
      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept':
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0',
        },
        timeout: 8000, // 8 seconds max wait time
        httpsAgent: agent,
        decompress: true,
      });

      const $ = cheerio.load(response.data);

      const title = $('head > title').text().trim() || '';

      // Fallback strategy for description: Meta Description -> OpenGraph -> Empty
      const metaDescription =
        $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content') ||
        '';

      return {
        title: title.slice(0, 200), // Truncate to reasonable length
        metaDescription: metaDescription.slice(0, 500),
        isAlive: true,
      };
    } catch (error) {
      // Graceful degradation: Log the failure but don't crash the pipeline
      this.logger.warn(
        `Spider failed for ${targetUrl}: ${error.message} (Status: ${error.response?.status || 'Unknown'})`,
      );
      return { title: '', metaDescription: '', isAlive: false };
    }
  }
}
