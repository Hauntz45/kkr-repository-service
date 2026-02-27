export interface EnrichmentResult {
  summary: string;
  tags: string[];
}

export interface IEnrichmentStrategy {
  enrich(text: string): Promise<EnrichmentResult>;
}
