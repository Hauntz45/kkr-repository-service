import { Injectable } from '@nestjs/common';
import { IEnrichmentStrategy, EnrichmentResult, EnrichmentContext } from '../enrichment.interface';

@Injectable()
export class RegexStrategy implements IEnrichmentStrategy {
  async enrich(context: EnrichmentContext): Promise<EnrichmentResult> {
    const { description, industry, websiteTitle, websiteDescription } = context;
    const tags: string[] = [];
    
    // 1. Always add the KKR Industry as a baseline tag
    if (industry) tags.push(industry);

    // 2. Combine all sources into one big text blob for scanning
    // We treat title and meta description as high-value signals
    const combinedText = `
      ${description || ''} 
      ${websiteTitle || ''} 
      ${websiteDescription || ''}
    `.toLowerCase();

    // 3. Expanded Keyword List
    const keywords = [
      'software', 'healthcare', 'infrastructure', 'consumer', 'finance', 
      'energy', 'insurance', 'b2b', 'saas', 'logistics', 'real estate',
      'pharmaceutical', 'manufacturing', 'retail', 'telecom', 'media',
      'automotive', 'technology', 'education', 'cybersecurity'
    ];
    
    keywords.forEach(k => {
      if (combinedText.includes(k)) {
        // Capitalize first letter (e.g., "saas" -> "Saas")
        tags.push(k.charAt(0).toUpperCase() + k.slice(1));
      }
    });

    // 4. Deduplicate tags
    const uniqueTags = [...new Set(tags)];

    return {
      // Use the website title if available as it's often cleaner, otherwise use the description
      summary: (websiteTitle && websiteTitle.length > 10) 
        ? websiteTitle 
        : (description.split('.')[0] + '.'),
      tags: uniqueTags.length > 0 ? uniqueTags : ['General'],
    };
  }
}
