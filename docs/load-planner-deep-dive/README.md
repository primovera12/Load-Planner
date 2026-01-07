# LOAD PLANNER - Complete Deep Dive Planning Documentation

## Enterprise Freight Load Optimization System
## Version 2.0 - Now with 3D Visualization, Multi-Item Planning & Sharing

---

## 📋 DOCUMENT INDEX

This folder contains comprehensive planning documentation for the Load Planner project, designed for implementation with Claude Code.

### Core Planning Documents

| # | Document | Description | Size |
|---|----------|-------------|------|
| 01 | [Discovery & Scoping](./01-DISCOVERY-AND-SCOPING.md) | Problem statement, user personas, competitive analysis | 17KB |
| 02 | [Technical Architecture](./02-TECHNICAL-ARCHITECTURE.md) | System design, service specifications, data flows | 47KB |
| 03 | [Database Schema](./03-DATABASE-SCHEMA.md) | Complete Prisma schema, all tables, relationships | 43KB |
| 04 | [API Endpoints](./04-API-ENDPOINTS.md) | All REST endpoints, request/response formats | 28KB |
| 05 | [Screen Catalog](./05-SCREEN-CATALOG.md) | UI/UX specs, wireframes, component library | 66KB |
| 06 | [State Permit Database](./06-STATE-PERMIT-DATABASE.md) | All 50 states' permit fees, escort rules | 56KB |
| 07 | [Development Roadmap](./07-DEVELOPMENT-ROADMAP.md) | Original task breakdown | 30KB |
| 08 | [Truck Specifications](./08-TRUCK-SPECIFICATIONS.md) | Complete trailer database, deck heights | 20KB |
| 09 | [Sample Data & Test Cases](./09-SAMPLE-DATA-TEST-CASES.md) | Test emails, expected outputs | 16KB |

### Version 2.0 Updates (NEW)

| # | Document | Description | Size |
|---|----------|-------------|------|
| 10 | [Competitive Analysis: Cargo-Planner](./10-COMPETITIVE-ANALYSIS-CARGO-PLANNER.md) | Feature comparison, adoption strategy | 20KB |
| 11 | [**Updated Master Plan v2**](./11-UPDATED-MASTER-PLAN-V2.md) | Revised 7-phase roadmap with new features | 45KB |
| 12 | [**Updated Screen Catalog v2**](./12-UPDATED-SCREEN-CATALOG-V2.md) | New screens: 3D view, import, sharing | 35KB |
| 13 | [**Updated Development Roadmap v2**](./13-UPDATED-DEVELOPMENT-ROADMAP-V2.md) | Complete task breakdown with prompts | 40KB |

**Total:** ~450KB+ of specifications

---

## 🎯 PROJECT SUMMARY

### What is Load Planner?

Load Planner is a comprehensive freight load optimization system that transforms the manual, error-prone process of quoting heavy haul shipments into an automated, AI-powered workflow.

### Core Flow

```
📧 Paste Email → 🤖 AI Parses → 🚛 Truck Recommended → 🗺️ Route Planned → 💰 Quote Generated
```

### Key Features

- **AI Email Parsing**: Extract dimensions, weights, locations from unstructured emails
- **Smart Truck Selection**: Recommend optimal trailer based on cargo specifications
- **3D Visualization**: Interactive view of cargo on trailer ← NEW in v2
- **Multi-Item Planning**: Optimize multiple pieces across trucks ← NEW in v2
- **Excel Import**: Bulk import from spreadsheets ← NEW in v2
- **Permit Calculation**: Automatic permit fees for all 50 states
- **Route Planning**: Truck-specific routing with clearance checking
- **Quote Generation**: Professional PDF quotes with full cost breakdown
- **Shareable Links**: Share load plans with customers ← NEW in v2

---

## 🏗️ TECHNOLOGY STACK

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 14+ (App Router) | Full-stack React |
| **Language** | TypeScript | Type safety |
| **Database** | PostgreSQL + Prisma | Data persistence |
| **AI** | Google Gemini API | Email parsing, NL interface |
| **3D Graphics** | Three.js + React-Three-Fiber | 3D visualization ← NEW |
| **Routing** | Geoapify API | Truck-specific routes |
| **Auth** | Clerk | User management |
| **Hosting** | Vercel | Deployment |
| **Styling** | Tailwind + shadcn/ui | UI components |

---

## 📅 DEVELOPMENT PHASES

### Phase 1: Core Foundation (Week 1-2)
**Goal:** Paste email → Get truck recommendation

- [x] Project setup with Next.js
- [x] Truck specifications database
- [x] AI email parser with Gemini
- [x] Truck selection algorithm
- [x] Simple web UI

**Deliverable:** Working analyzer page

### Phase 2: Routing & Permits (Week 2-3)
**Goal:** Calculate routes and permit costs

- [ ] Geoapify route integration
- [ ] State detection from coordinates
- [ ] Permit cost calculator
- [ ] Escort requirements
- [ ] Interactive map

**Deliverable:** Full route planning with costs

### Phase 3: Business Operations (Week 4-5)
**Goal:** Database persistence, quotes, customers

- [ ] PostgreSQL + Prisma setup
- [ ] Customer management
- [ ] Load management
- [ ] Quote generator
- [ ] PDF generation
- [ ] Authentication

**Deliverable:** Complete business system

### Phase 4: Advanced Features (Week 6+)
**Goal:** Polish and advanced capabilities

- [ ] Dashboard with metrics
- [ ] Securement calculator
- [ ] Load stacking optimizer
- [ ] Natural language search
- [ ] Mobile optimization

### Phase 5: Enterprise Scale (Future)
**Goal:** Multi-tenant, automation

- [ ] Company/team support
- [ ] API key management
- [ ] Email automation
- [ ] Analytics dashboard
- [ ] Audit logging

---

## 🚀 QUICK START FOR CLAUDE CODE

### Starting Phase 1

```
Read the master project document at /mnt/project/LOAD_PLANNER_MASTER_PROJECT.md

Then start with these prompts:

1. "Create the Next.js project structure for Load Planner with TypeScript and Tailwind"

2. "Create the truck database with all trailer types from the specifications"

3. "Create the email parser service using Gemini API"

4. "Create the truck selection algorithm"

5. "Create the analyzer page UI"
```

### Using This Documentation

1. **For high-level context**: Start with 01-DISCOVERY-AND-SCOPING.md
2. **For implementation details**: Reference the specific document needed
3. **For database work**: Use 03-DATABASE-SCHEMA.md
4. **For API design**: Use 04-API-ENDPOINTS.md
5. **For UI work**: Use 05-SCREEN-CATALOG.md
6. **For permit data**: Use 06-STATE-PERMIT-DATABASE.md
7. **For testing**: Use 09-SAMPLE-DATA-TEST-CASES.md

---

## 📁 FOLDER STRUCTURE

```
load-planner-deep-dive/
├── README.md                         # This file
├── 01-DISCOVERY-AND-SCOPING.md       # Business requirements
├── 02-TECHNICAL-ARCHITECTURE.md      # System design
├── 03-DATABASE-SCHEMA.md             # Prisma schema
├── 04-API-ENDPOINTS.md               # API specs
├── 05-SCREEN-CATALOG.md              # UI/UX specs
├── 06-STATE-PERMIT-DATABASE.md       # 50-state permit data
├── 07-DEVELOPMENT-ROADMAP.md         # Task breakdown
├── 08-TRUCK-SPECIFICATIONS.md        # Trailer database
└── 09-SAMPLE-DATA-TEST-CASES.md      # Test data
```

---

## 🔑 KEY IMPLEMENTATION NOTES

### Critical Calculations

**Height Calculation (Most Important!):**
```
Total Height = Cargo Height + Trailer Deck Height
Legal Limit = 13.5 feet

Example:
- 10' cargo on Flatbed (5' deck) = 15' total ❌ ILLEGAL
- 10' cargo on RGN (2' deck) = 12' total ✅ LEGAL
```

**Weight Calculation:**
```
Gross Vehicle Weight (GVW) = Cargo + Trailer + Tractor
Legal Limit = 80,000 lbs

Example:
- 48,000 lbs cargo + 15,000 lbs trailer + 17,000 lbs tractor = 80,000 GVW ✅
- 50,000 lbs cargo + 15,000 lbs trailer + 17,000 lbs tractor = 82,000 GVW ❌
```

### Trailer Selection Logic

| Cargo Height | Best Trailer | Reason |
|--------------|--------------|--------|
| < 8.5' | Flatbed | Most economical, widely available |
| 8.5' - 10' | Step Deck | Lower deck allows legal height |
| 10' - 11.5' | RGN | Even lower deck, drive-on capable |
| 11.5' - 12' | Lowboy | Lowest possible deck (1.5') |
| > 12' | Lowboy + Permit | Will exceed legal height |

### Permit Triggers

| Dimension | Legal Limit | Permit Needed |
|-----------|-------------|---------------|
| Width | 8.5 feet | > 8.5' = Oversize |
| Height | 13.5 feet | > 13.5' = Oversize |
| Length | 53 feet | > 53' = Oversize |
| Weight | 80,000 lbs | > 80k = Overweight |

---

## 📞 EXTERNAL SERVICES

| Service | Purpose | Pricing |
|---------|---------|---------|
| Google Gemini | AI email parsing | Free tier / $0.075/M tokens |
| Geoapify | Truck routing | €49/month for 100k credits |
| Low Clearance Map | Bridge heights | Contact for pricing |
| Clerk | Authentication | Free up to 10k MAU |
| Vercel | Hosting | Free tier available |

---

## ✅ SUCCESS METRICS

### Phase 1 Goals
- [ ] Parse >90% of email formats correctly
- [ ] Response time <3 seconds
- [ ] Truck recommendations match expert judgment

### Overall Goals
- [ ] Quote generation time <5 minutes (vs 30+ minutes manual)
- [ ] Permit cost accuracy >95%
- [ ] User satisfaction >80% positive

---

## 🤝 CONTRIBUTION

This documentation is designed to be:
- **Self-contained**: All specs in one place
- **Claude Code ready**: Specific prompts included
- **Realistic**: Based on actual freight industry requirements
- **Comprehensive**: Covers all phases of development

---

## 📝 DOCUMENT VERSIONS

| Document | Version | Last Updated |
|----------|---------|--------------|
| All docs | 1.0 | January 2025 |

---

*Generated for Load Planner project development with Claude Code*
