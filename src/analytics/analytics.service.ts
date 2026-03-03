import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
  ) {}

  /**
   * Generates real-time portfolio statistics using MongoDB Aggregation Framework.
   *
   * Architecture Note:
   * Calculations are offloaded to the Database Engine (C++) for performance.
   * Only the aggregated summary is transferred over the wire to Node.js.
   */
  async getPortfolioStats() {
    // 1. Core Distributions: Breakdown by static fields
    const industryStats = await this.groupAndCount('$industry');
    const regionStats = await this.groupAndCount('$region');
    const yearStats = await this.groupAndCount('$yearOfInvestment', { _id: 1 }); // Chronological order

    // 2. Intelligence Distribution: Analysis of AI-generated tags
    // Uses $unwind to deconstruct the tags array into individual documents for counting
    const tagStats = await this.companyModel
      .aggregate([
        { $unwind: '$aiAnalysis.tags' },
        { $group: { _id: '$aiAnalysis.tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ])
      .exec();

    // 3. Multi-Dimensional Trends (Time-Series Analysis)
    // Groups data by compound keys { Year, Industry } to facilitate Heatmap/Stacked Bar visualizations
    const industryTrend = await this.companyModel
      .aggregate([
        {
          $match: { yearOfInvestment: { $ne: null }, industry: { $ne: null } },
        },
        {
          $group: {
            _id: { year: '$yearOfInvestment', industry: '$industry' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, count: -1 } },
      ])
      .exec();

    const regionTrend = await this.companyModel
      .aggregate([
        { $match: { yearOfInvestment: { $ne: null }, region: { $ne: null } } },
        {
          $group: {
            _id: { year: '$yearOfInvestment', region: '$region' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1 } },
      ])
      .exec();

    return {
      meta: {
        totalCompanies: await this.companyModel.countDocuments(),
        generatedAt: new Date(),
      },
      distribution: {
        byIndustry: industryStats,
        byRegion: regionStats,
        byYear: yearStats,
        topAiTags: tagStats,
      },
      trends: {
        // Transformations for easier frontend consumption
        byIndustryOverTime: industryTrend.map((t) => ({
          year: t._id.year,
          industry: t._id.industry,
          count: t.count
        })),
        byRegionOverTime: regionTrend.map((t) => ({
          year: t._id.year,
          region: t._id.region,
          count: t.count
        })),
      },
    };
  }

  /**
   * Helper: Generic grouping function to reduce boilerplate.
   * @param field The field path to group by (e.g., '$industry')
   * @param sort Sort order configuration (Default: Count Descending)
   */
  private async groupAndCount(
    field: string,
    sort: Record<string, 1 | -1> = { count: -1 },
  ) {
    return this.companyModel
      .aggregate([
        { $match: { [field.substring(1)]: { $ne: null } } }, // Exclude null/missing values
        { $group: { _id: field, count: { $sum: 1 } } },
        { $sort: sort },
        { $limit: 50 },
      ])
      .exec();
  }
}
