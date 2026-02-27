import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { Company, CompanyDocument } from './schemas/company.schema';
import { EnrichmentService } from '../enrichment/enrichment.service';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    private enrichmentService: EnrichmentService,
  ) {}

  /**
   * Smart Upsert:
   * Only updates the database if the content hash has changed.
   */
  async createOrUpdate(companyData: Partial<Company>): Promise<{ result: Company; wasUpdated: boolean }> {
    const { name } = companyData;

    // 1. Generate Hash (Fingerprint of the new data)
    const contentHash = this.generateHash(companyData);

    // 2. Check for existing record
    // We select '+contentHash' because it is hidden by default
    const existing = await this.companyModel.findOne({ name }).select('+contentHash').exec();

    // CASE A: Optimization - Pure Skip
    // If the data is identical to what we have, DO NOTHING.
    if (existing && existing.contentHash === contentHash) {
      this.logger.debug(`No changes for "${name}". Skipping DB write.`);
      return { result: existing, wasUpdated: false };
    }

    // CASE B: New company OR Content changed.
    // This is where we trigger the AI.
    if (existing) {
        this.logger.log(`Changes detected for "${name}". Enriching & Updating...`);
    } else {
        this.logger.log(`New company found: "${name}". Enriching & Creating...`);
    }
    
    // 3. AI Enrichment Step
    // We only run this if we are sure we are going to write to the DB.
    const enrichment = await this.enrichmentService.enrichCompany(companyData.description || '');

    // 4. Save to Database
    const result = await this.companyModel.findOneAndUpdate(
      { name },
      { 
        ...companyData, 
        aiAnalysis: enrichment, // <--- Save the AI tags and summary
        contentHash,            // Save the new hash
        scrapedAt: new Date() 
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec();

    return { result: result!, wasUpdated: true };
  }

  async findAll(): Promise<Company[]> {
    return this.companyModel.find().exec();
  }

  /**
   * Helper: deterministic hash of the company object.
   * Sorts keys to ensure consistent hashing.
   */
  private generateHash(data: Partial<Company>): string {
    // We only hash the fields provided in data.
    // JSON.stringify ignores 'undefined', so we must ensure inputs are consistent.
    const stableString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('md5').update(stableString).digest('hex');
  }
}
