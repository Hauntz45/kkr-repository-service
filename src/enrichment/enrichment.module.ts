import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EnrichmentService } from './enrichment.service';
import { RegexStrategy } from './strategies/regex.strategy';
import { OllamaStrategy } from './strategies/ollama.strategy';

@Module({
  imports: [ConfigModule],
  providers: [EnrichmentService, RegexStrategy, OllamaStrategy],
  exports: [EnrichmentService],
})
export class EnrichmentModule {}
