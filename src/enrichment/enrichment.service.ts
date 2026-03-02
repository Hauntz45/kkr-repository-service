import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IEnrichmentStrategy,
  EnrichmentResult,
  EnrichmentContext,
} from './enrichment.interface';
import { RegexStrategy } from './strategies/regex.strategy';
import { OllamaStrategy } from './strategies/ollama.strategy';

/**
 * Facade for the Enrichment subsystem.
 * Determines which strategy to use based on environment configuration.
 */
@Injectable()
export class EnrichmentService {
  private strategy: IEnrichmentStrategy;
  private readonly logger = new Logger(EnrichmentService.name);

  constructor(
    private configService: ConfigService,
    private regexStrategy: RegexStrategy,
    private ollamaStrategy: OllamaStrategy,
  ) {
    // Feature Flag: ENABLE_LLM
    const useLLM = this.configService.get<string>('ENABLE_LLM') === 'true';

    if (useLLM) {
      this.logger.log('AI Mode: ON (Llama 3.2 via Ollama)');
      this.strategy = this.ollamaStrategy;
    } else {
      this.logger.log('Fast Mode: ON (Regex Keyword Extraction)');
      this.strategy = this.regexStrategy;
    }
  }

  async enrichCompany(context: EnrichmentContext): Promise<EnrichmentResult> {
    // Fail-safe: If no description provided, return empty
    if (!context.description) return { summary: '', tags: [] };
    return this.strategy.enrich(context);
  }
}
