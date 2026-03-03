# KKR Portfolio Intelligence Engine


![Stack](https://img.shields.io/badge/Tech-NestJS%20%7C%20MongoDB%20%7C%20Docker-blue)
![AI](https://img.shields.io/badge/AI-Llama%203.2%20(Ollama)-orange)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

## Executive Summary
The **KKR Portfolio Intelligence Engine** is a specialized ETL (Extract, Transform, Load) pipeline designed to aggregate, enrich, and analyze the investment portfolio of **KKR (Kohlberg Kravis Roberts)**, one of the world's leading global investment firms.

Unlike traditional scrapers that produce raw text, this system functions as a **Market Intelligence Platform**. It combines direct source extraction with **Generative AI** and **External Metadata Crawling** to transform fragmented web data into structured signals, visualizing them in a real-time dashboard.

### Business Value & Use Cases
Private market data is notoriously opaque. This tool bridges the information gap for:

1.  **Deal Sourcing & Trend Detection:**
    *   *Problem:* Competitors need to know where KKR is deploying capital *now*.
    *   *Solution:* The **Analytics Dashboard** visualizes investment velocity over time, plotting Year-over-Year trends by Industry and Region. This highlights strategic pivots (e.g., a sudden shift from "Energy" to "Tech Growth").


2.  **B2B Vendor Prospecting:**
    *   *Problem:* Service providers (Cloud, HR, Legal) want to sell to KKR-backed firms but lack contact data.
    *   *Solution:* Our AI normalizes vague descriptions into precise tags (e.g., `["SaaS", "B2B", "Cybersecurity"]`). The **CSV Export** feature allows sales teams to download this enriched list directly into their CRM.

3.  **Portfolio Health Monitoring:**
    *   *Problem:* "Zombie" companies (dead websites) are red flags in a portfolio.
    *   *Solution:* The integrated **Spider Service** validates external URLs and captures metadata, providing a live health check on the portfolio's digital presence.

---

## Quick Start

### Prerequisites
*   **Docker Desktop** (Required for Database)
*   **Node.js v20+**
*   **Ollama** (Required for AI features) with `llama3.2` model pulled.

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/Hauntz45/kkr-repository-service.git
    cd kkr-portfolio-service
    ```

2.  **Start Infrastructure**
    Spin up the MongoDB instance.
    ```bash
    docker-compose up -d
    ```

3.  **Install Dependencies**
    ```bash
    npm install
    ```

4.  **Configure Environment**
    Create a `.env` file in the root directory:
    ```env
    MONGO_URI=mongodb://root:rootpassword@localhost:27017/kkr_portfolio?authSource=admin
    PORT=3000
    ENABLE_LLM=true  # Set to 'false' for high-speed Regex mode
    ```

5.  **Run the Application**
    ```bash
    npm run start:dev
    ```

### Usage
#### 1. Visual Dashboard
Access the **Real-Time Analytics Dashboard** at **[http://localhost:3000/](http://localhost:3000/)**.
*   View Industry Exposure, Regional Trends, and AI Tag Clouds.
*   Monitor total companies tracked.

#### 2. Swagger API
Access the **API Documentation** at **[http://localhost:3000/api](http://localhost:3000/api)**.


  #### Core Workflows:
1.  **Trigger ETL Pipeline:**
    *   `POST /scraper/sync`
    *   *Action:* Scrapes KKR, checks for changes, fetches external metadata, runs AI enrichment, and updates the DB.
2.  **Search Companies:**
    *   `GET /companies/search?q=Software`
    *   *Action:* Returns companies matching the partial name (Case Insensitive).
3.  **View All Data:**
    *   `GET /companies`
4.  **Delete Company:**
    *   `DELETE /companies/{name}`
    *   *Action:* Deletes the company matching the exact name from the database.
5.  **Analyse portfolios:**
    *   `GET /analytics`
    *   *Action:* returns pre-aggregated metrics (Industry distribution, Investment velocity, Region heatmaps) ready for dashboard visualization.
6.  **Data Export:**
    *   `GET /companies/export`
    *   *Action:* generates a CSV file of the entire enriched dataset, enabling easy integration with Excel or Tableau.

---

## AI & Enrichment Strategy
The system employs a **Hybrid Intelligence Strategy** to balance accuracy, cost, and performance.

| Feature | Method | Business Logic |
| :--- | :--- | :--- |
| **Context Injection** | Prompt Engineering | We feed KKR's official `Industry` and `Asset Class` into the LLM prompt. This prevents hallucinations by grounding the AI in trusted data. |
| **Prompt Hardening** | Negative Constraints | The LLM is strictly instructed to output **JSON only** and avoid generic tags (e.g., "Company"). It enforces a specific taxonomy: `[Industry, Model, Product]`. |
| **Offline Fallback** | Regex Heuristics | If the AI service is unreachable or disabled, the system seamlessly degrades to a weighted keyword dictionary, ensuring 100% uptime. |

---

## Resilience & Performance
*   **Circuit Breaker:** Automatically pauses the scraper if KKR's server returns consecutive errors (4xx/5xx) to prevent IP bans.
*   **Smart Upsert (Hashing):** Uses MD5 content hashing (`crypto`) to compare incoming data against the database. If the hash matches, the DB write is skipped. This reduces IOPS by ~95% on subsequent runs.
*   **Polite Scraping:** Implements Exponential Backoff and mimicry of human browsing headers (User-Agent spoofing) to respect server policies.
*   **Read-Time Aggregation:** Uses MongoDB Aggregation Pipelines to calculate complex trends on the fly, ensuring the Dashboard always reflects the latest data without pre-calculation jobs.

## Future Roadmap
*   **Cron Scheduling:** Automate daily syncs.
*   **Team Mapping:** Scrape KKR Team pages to map specific Deal Partners to Portfolio Companies.
*   **News Integration:** Fetch recent press releases via Google News API for exit/IPO signals.