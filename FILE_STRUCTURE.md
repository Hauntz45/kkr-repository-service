# Project File Structure & Responsibilities

This document provides a granular breakdown of every file and directory in the `kkr-portfolio-service`. It serves as a map to understand the Modular Monolith architecture.

## Root Directory
*Configuration and Infrastructure*

| File | Responsibility |
| :--- | :--- |
| **`docker-compose.yml`** | Defines the Infrastructure as Code (IaC). Spins up the MongoDB container with persistent volumes and authentication credentials. |
| **`.env`** | Environment variables (Secrets). Stores DB connection strings, feature flags (`ENABLE_LLM`), and API keys. **Not committed to Git.** |
| **`package.json`** | Manifest for project dependencies (NestJS, Mongoose, Axios, Cheerio) and run scripts (`npm run start:dev`). |
| **`tsconfig.json`** | TypeScript compiler configuration. Enforces strict typing and path mapping. |
| **`nest-cli.json`** | Configuration for the NestJS CLI. Defines how the project is built and structured. |
| **`.eslintrc.js`** | Linter configuration. Enforces code quality rules and consistency. |
| **`.prettierrc`** | Formatter configuration. Ensures consistent code styling (indentation, quotes). |
| **`README.md`** | Executive summary, setup instructions, and business value proposition. |
| **`ARCHITECTURE.md`** | Deep dive into design patterns, data flow diagrams, and architectural decisions. |
| **`verify-data.ts`** | A standalone utility script to dump the MongoDB contents to a local JSON file for manual inspection/verification. |

---

## Source Code (`src/`)
*Application Logic*

### 1. Entry & Core
| File | Responsibility |
| :--- | :--- |
| **`main.ts`** | The application entry point. Bootstraps the NestJS factory, configures global validation pipes, and initializes **Swagger UI**. |
| **`app.module.ts`** | The **Root Module**. Composes the application by importing feature modules (`Companies`, `Scraper`, `Enrichment`) and configuring the Database connection. |

### 2. Companies Module (`src/companies/`)
*Domain: Persistence & Retrieval (The "Source of Truth")*

| File | Responsibility |
| :--- | :--- |
| **`companies.module.ts`** | Bundles the controller, service, and Mongoose schema. Exports the Service for use by the Scraper. |
| **`companies.controller.ts`** | **API Layer.** Exposes REST endpoints (`GET /companies`, `GET /search`, `DELETE /:name`) and handles Swagger annotations. |
| **`companies.service.ts`** | **Business Layer.** The heart of the system. Implements the **Smart Upsert** (Hashing) logic and orchestrates the Enrichment pipeline (calling Spider + AI). |
| **`schemas/company.schema.ts`** | **Data Layer.** Defines the MongoDB schema, indexes (`name`), and embedded document structures (`websiteData`, `aiAnalysis`). |

### 3. Scraper Module (`src/scraper/`)
*Domain: Data Ingestion (ETL)*

| File | Responsibility |
| :--- | :--- |
| **`scraper.module.ts`** | Bundles the scraper logic. Imports `CompaniesModule` to save data. |
| **`scraper.controller.ts`** | **Trigger Layer.** Exposes `POST /scraper/sync` to manually trigger the ETL job. |
| **`scraper.service.ts`** | **Extraction Layer.** Handles communication with KKR's API. Implements **Resiliency Patterns** (Retry, Circuit Breaker, Rate Limiting). |
| **`types.ts`** | TypeScript interfaces defining the shape of the raw JSON response from KKR. Ensures type safety during extraction. |

### 4. Enrichment Module (`src/enrichment/`)
*Domain: Intelligence & AI*

| File | Responsibility |
| :--- | :--- |
| **`enrichment.module.ts`** | Bundles the AI strategies. |
| **`enrichment.service.ts`** | **Factory/Facade.** Determines which strategy to use (AI vs Regex) based on the `ENABLE_LLM` flag. |
| **`enrichment.interface.ts`** | Defines the `IEnrichmentStrategy` contract. Ensures both AI and Regex strategies output the same structure. |
| **`strategies/ollama.strategy.ts`** | **AI Implementation.** Connects to local Llama 3.2. Handles Prompt Engineering and Context Injection. |
| **`strategies/regex.strategy.ts`** | **Fallback Implementation.** Uses keyword heuristics to tag companies when AI is disabled. |

### 5. Spider Module (`src/spider/`)
*Domain: External Connectivity*

| File | Responsibility |
| :--- | :--- |
| **`spider.module.ts`** | Bundles the spider logic. Exports `SpiderService`. |
| **`spider.service.ts`** | **Crawler.** Fetches external websites. Handles User-Agent spoofing, SSL headers, and HTML parsing (Cheerio) to extract metadata. |

---

## Test Directory (`test/`)
*Auto-generated E2E Tests*

| File | Responsibility |
| :--- | :--- |
| **`app.e2e-spec.ts`** | End-to-End tests for the application. (Currently standard boilerplate). |
| **`jest-e2e.json`** | Configuration for the Jest testing framework. |