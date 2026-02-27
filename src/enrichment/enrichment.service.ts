import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEnrichmentStrategy, EnrichmentResult } from './enrichment.interface';
import { RegexStrategy } from './strategies/regex.strategy';
import { OllamaStrategy } from './strategies/ollama.strategy';

@Injectable()
export class EnrichmentService {
  private strategy: IEnrichmentStrategy;
  private readonly logger = new Logger(EnrichmentService.name);

  constructor(
    private configService: ConfigService,
    private regexStrategy: RegexStrategy,
    private ollamaStrategy: OllamaStrategy,
  ) {
    const useLLM = this.configService.get<string>('ENABLE_LLM') === 'true';
    
    if (useLLM) {
      this.logger.log('AI Mode: ON (Llama 3.2)');
      this.strategy = this.ollamaStrategy;
    } else {
      this.logger.log('Fast Mode: ON (Regex)');
      this.strategy = this.regexStrategy;
    }
  }

  async enrichCompany(description: string): Promise<EnrichmentResult> {
    if (!description) return { summary: '', tags: [] };
    return this.strategy.enrich(description);
  }
}
