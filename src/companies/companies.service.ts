import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from './schemas/company.schema';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
  ) {}

  /**
   * Upsert (Update or Insert) a company based on its name.
   * This ensures idempotency - running the scraper twice won't create duplicates.
   */
  async createOrUpdate(companyData: Partial<Company>): Promise<Company> {
    const { name } = companyData;
    
    return this.companyModel.findOneAndUpdate(
      { name }, // Search criteria
      { ...companyData, scrapedAt: new Date() }, // Update these fields
      { upsert: true, new: true, setDefaultsOnInsert: true } // Options
    ).exec();
  }

  /**
   * Retrieve all companies for the frontend/API
   */
  async findAll(): Promise<Company[]> {
    return this.companyModel.find().exec();
  }
}
