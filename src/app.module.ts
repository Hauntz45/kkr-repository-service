import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CompaniesModule } from './companies/companies.module';
import { ScraperModule } from './scraper/scraper.module';
import { EnrichmentModule } from './enrichment/enrichment.module';
import { SpiderModule } from './spider/spider.module';

@Module({
  imports: [
    // 1. Global Configuration (Load .env)
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // 2. Database Connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    // 3. Feature Modules
    CompaniesModule,
    ScraperModule,
    EnrichmentModule,
    SpiderModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
