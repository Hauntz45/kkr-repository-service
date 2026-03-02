import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { Company, CompanyDocument } from './schemas/company.schema';
import { EnrichmentService } from '../enrichment/enrichment.service';
import { SpiderService, WebsiteMetadata } from '../spider/spider.service';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    private enrichmentService: EnrichmentService,
    private spiderService: SpiderService,
  ) {}

  /**
   * Upserts a company record with Optimistic Deduplication.
   *
   * Strategy:
   * 1. Generate a content hash of the incoming business data.
   * 2. Compare with the existing record's hash.
   * 3. If identical, skip the write operation to save DB IOPS and preserve 'updatedAt'.
   * 4. If different, trigger the Enrichment Pipeline (Spider + AI).
   */
  async createOrUpdate(
    companyData: Partial<Company>,
  ): Promise<{ result: Company; wasUpdated: boolean }> {
    const { name, website } = companyData;

    // 1. Change Detection (Hash)
    const contentHash = this.generateHash(companyData);
    const existing = await this.companyModel
      .findOne({ name })
      .select('+contentHash')
      .exec();

    // 2. Optimization: Skip write if data hasn't changed
    if (existing && existing.contentHash === contentHash) {
      this.logger.debug(`No changes detected for "${name}". Skipping update.`);
      return { result: existing, wasUpdated: false };
    }

    // 3. Log Change Event
    if (existing) {
      this.logger.log(
        `Data change detected for "${name}". Initiating enrichment pipeline.`,
      );
    } else {
      this.logger.log(
        `New company discovered: "${name}". Initiating enrichment pipeline.`,
      );
    }

    // --- Pipeline Step 1: External Metadata Extraction (Spider) ---
    let websiteData: WebsiteMetadata | null = null;
    if (website) {
      websiteData = await this.spiderService.fetchMetadata(website);
    }

    // --- Pipeline Step 2: AI Enrichment (Brain) ---
    const enrichment = await this.enrichmentService.enrichCompany({
      description: companyData.description || '',
      industry: companyData.industry || '',
      assetClass: companyData.assetClass || '',
      region: companyData.region || '',
      websiteTitle: websiteData?.title,
      websiteDescription: websiteData?.metaDescription,
    });

    // --- Pipeline Step 3: Persistence (Database) ---
    const result = await this.companyModel
      .findOneAndUpdate(
        { name },
        {
          ...companyData,
          aiAnalysis: enrichment,
          websiteData: websiteData,
          contentHash,
          scrapedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    return { result: result!, wasUpdated: true };
  }

  /**
   * Performs a case-insensitive, partial match search.
   * @param query Search term (e.g., "Dentist")
   */
  async search(query: string): Promise<Company[]> {
    return this.companyModel
      .find({
        name: { $regex: query, $options: 'i' },
      })
      .exec();
  }

  async findAll(): Promise<Company[]> {
    return this.companyModel.find().exec();
  }

  /**
   * Removes a company record.
   * Useful for testing the "New Company" flow via Swagger.
   */
  async remove(name: string): Promise<{ deleted: boolean; message: string }> {
    const result = await this.companyModel.findOneAndDelete({ name }).exec();
    if (!result)
      return { deleted: false, message: `Company "${name}" not found.` };

    this.logger.log(`Manually deleted company: "${name}"`);
    return { deleted: true, message: `Successfully deleted "${name}".` };
  }

  /**
   * Generates a deterministic MD5 hash of the data object.
   * Used for efficient change detection.
   */
  private generateHash(data: Partial<Company>): string {
    const stableString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('md5').update(stableString).digest('hex');
  }
}
