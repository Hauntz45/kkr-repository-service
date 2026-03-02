/**
 * Defines the contract for any Intelligence Strategy.
 * Allows easy swapping of models (Ollama vs OpenAI vs Regex) without changing business logic.
 */
export interface EnrichmentResult {
  summary: string;
  tags: string[];
}

/**
 * Context provided to the enrichment engine to improve accuracy.
 */
export interface EnrichmentContext {
  description: string;
  industry: string;
  assetClass: string;
  region: string;
  websiteTitle?: string;
  websiteDescription?: string;
}

export interface IEnrichmentStrategy {
  enrich(context: EnrichmentContext): Promise<EnrichmentResult>;
}
