import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { Company, CompanyDocument } from './schemas/company.schema';
import { EnrichmentService } from '../enrichment/enrichment.service';
import { SpiderService, WebsiteMetadata } from '../spider/spider.service'; // <--- Import Interface

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    private enrichmentService: EnrichmentService,
    private spiderService: SpiderService, // <--- Inject Spider
  ) {}

  async createOrUpdate(companyData: Partial<Company>): Promise<{ result: Company; wasUpdated: boolean }> {
    const { name, website } = companyData;

    // 1. Generate Hash
    const contentHash = this.generateHash(companyData);

    // 2. Check for existing record
    const existing = await this.companyModel.findOne({ name }).select('+contentHash').exec();

    // CASE A: Optimization - Pure Skip
    if (existing && existing.contentHash === contentHash) {
      this.logger.debug(`No changes for "${name}". Skipping DB write.`);
      return { result: existing, wasUpdated: false };
    }

    // CASE B: New/Changed - Run the Pipeline
    if (existing) {
        this.logger.log(`Changes detected for "${name}". Enriching & Updating...`);
    } else {
        this.logger.log(`New company found: "${name}". Enriching & Creating...`);
    }

    // --- STEP 1: SPIDER (Fetch external data) ---
    // Fix: Explicitly type the variable so TypeScript knows it can have properties later
    let websiteData: WebsiteMetadata | null = null;
    
    if (website) {
        this.logger.debug(`Crawling ${website}...`);
        websiteData = await this.spiderService.fetchMetadata(website);
    }

    // --- STEP 2: AI ENRICHMENT (Pass all context) ---
    // Now we can safely access websiteData?.title because TS knows the type
    const enrichment = await this.enrichmentService.enrichCompany({
        description: companyData.description || '',
        industry: companyData.industry || '',
        assetClass: companyData.assetClass || '',
        region: companyData.region || '',
        websiteTitle: websiteData?.title,         
        websiteDescription: websiteData?.metaDescription 
    });

    // --- STEP 3: SAVE ---
    const result = await this.companyModel.findOneAndUpdate(
      { name },
      { 
        ...companyData, 
        aiAnalysis: enrichment,
        websiteData: websiteData, // Save the raw spider data
        contentHash,
        scrapedAt: new Date() 
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec();

    return { result: result!, wasUpdated: true };
  }

  async findAll(): Promise<Company[]> {
    return this.companyModel.find().exec();
  }

  private generateHash(data: Partial<Company>): string {
    const stableString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('md5').update(stableString).digest('hex');
  }
}
