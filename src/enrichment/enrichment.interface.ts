export interface EnrichmentResult {
  summary: string;
  tags: string[];
}

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
