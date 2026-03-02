import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as https from 'https';

export interface WebsiteMetadata {
  title: string;
  metaDescription: string;
  isAlive: boolean;
}

@Injectable()
export class SpiderService {
  private readonly logger = new Logger(SpiderService.name);

  async fetchMetadata(url: string): Promise<WebsiteMetadata> {
    if (!url) return { title: '', metaDescription: '', isAlive: false };

    // 1. Ensure protocol exists
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;

    try {
      // 2. Create a custom agent to handle SSL issues
      const agent = new https.Agent({ 
        rejectUnauthorized: false,
        keepAlive: true 
      });
      
      // 3. Mimic a real Chrome browser on Windows
      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
        },
        timeout: 8000, // Increased to 8s
        httpsAgent: agent,
        // vital for some sites to handle compression correctly
        decompress: true,
      });

      const $ = cheerio.load(response.data);
      
      const title = $('head > title').text().trim() || '';
      const metaDescription = 
        $('meta[name="description"]').attr('content') || 
        $('meta[property="og:description"]').attr('content') || 
        '';

      return {
        title: title.slice(0, 200),
        metaDescription: metaDescription.slice(0, 500),
        isAlive: true,
      };

    } catch (error) {
      // Log simple error message instead of full stack trace
      this.logger.warn(`Failed to visit ${targetUrl}: ${error.message} (Status: ${error.response?.status || 'Unknown'})`);
      return { title: '', metaDescription: '', isAlive: false };
    }
  }
}
