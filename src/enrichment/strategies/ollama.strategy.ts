import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  IEnrichmentStrategy,
  EnrichmentResult,
  EnrichmentContext,
} from '../enrichment.interface';

/**
 * AI Strategy: Uses a local LLM (Llama 3.2 via Ollama) to generate insights.
 *
 * Features:
 * - Context Injection: Uses Industry + Website Meta to reduce hallucinations.
 * - Prompt Hardening: Enforces specific JSON output format and tag distinctness.
 * - Language Normalization: Translates non-English inputs to English.
 */
@Injectable()
export class OllamaStrategy implements IEnrichmentStrategy {
  private readonly logger = new Logger(OllamaStrategy.name);
  private readonly OLLAMA_URL = 'http://localhost:11434/api/generate';
  private readonly MODEL = 'llama3.2'; // Optimized for edge/laptop inference

  async enrich(context: EnrichmentContext): Promise<EnrichmentResult> {
    const { description, industry, websiteTitle, websiteDescription } = context;

    // Structured Prompt Engineering
    const prompt = `
      Role: Senior Private Equity Analyst.
      
      Input Data:
      - KKR Industry Category: ${industry}
      - KKR Description: "${description}"
      - Website Title: "${websiteTitle || 'N/A'}"
      - Website Meta: "${websiteDescription || 'N/A'}"
      
      Task:
      1. Write a 1-sentence executive summary (max 20 words).
      2. Generate exactly 3 tags following this framework:
         - Tag 1: The specific Industry (e.g., "Dental Services").
         - Tag 2: The Business Model (e.g., "B2B", "SaaS").
         - Tag 3: The Key Product/Asset (e.g., "Implants").
      
      Constraints:
      - Tags must be DISTINCT (No synonyms).
      - Do NOT use generic tags like "Company" or "Business".
      - Translate all non-English input to ENGLISH.
      - Output ONLY valid JSON.
      
      Expected Output Format:
      { "summary": "...", "tags": ["Tag1", "Tag2", "Tag3"] }
    `;

    try {
      const response = await axios.post(this.OLLAMA_URL, {
        model: this.MODEL,
        prompt: prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.1, // Low temp for deterministic, factual results
        },
      });

      return JSON.parse(response.data.response);
    } catch (error) {
      this.logger.error(
        `Ollama failed: ${error.message}. Falling back to basic data.`,
      );
      return { summary: description, tags: [industry] };
    }
  }
}
