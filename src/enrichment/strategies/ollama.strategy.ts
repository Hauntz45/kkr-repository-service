import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { IEnrichmentStrategy, EnrichmentResult } from '../enrichment.interface';

@Injectable()
export class OllamaStrategy implements IEnrichmentStrategy {
  private readonly logger = new Logger(OllamaStrategy.name);
  private readonly OLLAMA_URL = 'http://localhost:11434/api/generate';
  private readonly MODEL = 'llama3.2'; // Matches what we pulled

  async enrich(text: string): Promise<EnrichmentResult> {
    const prompt = `
      You are a financial analyst. Analyze this company description: "${text}"
      
      Return a JSON object with:
      1. "summary": A 10-word business summary.
      2. "tags": Array of 3 specific industry tags.
      
      Output ONLY VALID JSON. No markdown.
    `;

    try {
      const response = await axios.post(this.OLLAMA_URL, {
        model: this.MODEL,
        prompt: prompt,
        stream: false,
        format: 'json' // Forces JSON output
      });

      return JSON.parse(response.data.response);
    } catch (error) {
      this.logger.error(`Ollama failed: ${error.message}`);
      return { summary: text, tags: [] };
    }
  }
}
