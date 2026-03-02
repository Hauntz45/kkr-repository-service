export interface KKRPortfolioItem {
  name: string;
  hq: string;
  description: string;
  industry: string;
  assetClass: string;
  region: string;
  url: string;
  yoi: string; // The API returns year as a string
  logo: string;
}

export interface KKRResponse {
  success: boolean;
  pages: number;
  results: KKRPortfolioItem[];
}
