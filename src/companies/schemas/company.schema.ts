import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CompanyDocument = HydratedDocument<Company>;

@Schema({ timestamps: true }) // Adds createdAt and updatedAt automatically
export class Company {
  @Prop({ required: true, unique: true, index: true })
  name: string;

  @Prop()
  industry: string;

  @Prop()
  assetClass: string;

  @Prop()
  region: string;

  @Prop()
  hqLocation: string;

  @Prop()
  description: string;

  @Prop()
  website: string;

  @Prop()
  yearOfInvestment: number;

  @Prop()
  logoUrl: string;

  // NEW: Stores the hash of the content to detect changes
  @Prop({ select: false }) // Don't return this in API calls by default
  contentHash: string;

  @Prop({ default: Date.now })
  scrapedAt: Date;

  @Prop({ type: Object })
  websiteData?: {
    title?: string;
    metaDescription?: string;
    isAlive: boolean;
    lastCheckedAt: Date;
  };

  // Placeholder for the AI Enrichment (Bonus)
  @Prop({ type: Object, required: false })
  aiAnalysis?: {
    summary?: string;
    tags?: string[];
  };
}

export const CompanySchema = SchemaFactory.createForClass(Company);
