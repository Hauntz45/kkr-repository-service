import { Injectable } from '@nestjs/common';
import { IEnrichmentStrategy, EnrichmentResult } from '../enrichment.interface';

@Injectable()
export class RegexStrategy implements IEnrichmentStrategy {
  async enrich(text: string): Promise<EnrichmentResult> {
    const tags: string[] = [];
    const lowerText = text.toLowerCase();
    const keywords = ['software', 'healthcare', 'infrastructure', 'consumer', 'finance', 'energy', 'insurance'];
    
    keywords.forEach(k => {
      if (lowerText.includes(k)) tags.push(k.charAt(0).toUpperCase() + k.slice(1));
    });

    return {
      summary: text.split('.')[0] + '.',
      tags: tags.length > 0 ? tags : ['General'],
    };
  }
}
