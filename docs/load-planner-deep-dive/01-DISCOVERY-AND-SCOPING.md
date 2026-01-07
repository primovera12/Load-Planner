# LOAD PLANNER - Deep Dive Planning Document
## Part 1: Discovery & Scoping

**Version:** 1.0  
**Created:** January 2025  
**Purpose:** Complete enterprise-level planning for Claude Code development

---

## 1. CORE PROBLEM STATEMENT

### 1.1 The Problem

Heavy haul and oversize freight operations currently rely on:
1. **Manual email parsing** - Dispatchers manually read load request emails and extract dimensions, weights, and locations
2. **Tribal knowledge** - Truck selection depends on experienced staff knowing which trailer fits what load
3. **Third-party services** - Companies like Oversize.io charge $50-200/month for permit calculations
4. **Spreadsheet chaos** - Permit fees, escort requirements, and legal limits tracked in outdated Excel files
5. **Quote guesswork** - Pricing often based on gut feel rather than accurate cost calculations

### 1.2 Why Existing Solutions Fail

| Solution | Failure Points |
|----------|---------------|
| **Oversize.io** | Expensive subscription, can't customize, data not owned, limited AI |
| **Manual processes** | Slow, error-prone, doesn't scale, knowledge loss when staff leaves |
| **Generic TMS systems** | Not specialized for heavy haul, poor permit support, expensive |
| **Spreadsheets** | Outdated quickly, no automation, hard to share, calculation errors |
| **LoadPilot, HeavyHaulSoft** | Legacy interfaces, poor UX, limited integrations |

### 1.3 Our Differentiators

1. **AI-First Architecture** - Not bolted on; AI is core to email parsing, recommendations, and NL interface
2. **Self-Owned Data** - Complete control over truck specs, permit data, customer info
3. **Real-Time Accuracy** - Permit costs calculated from authoritative state data, not estimates
4. **Modern Stack** - Fast, responsive, mobile-friendly (not legacy software from 2005)
5. **Vertical Integration** - Email → Truck → Route → Permits → Quote in one flow
6. **Customizable** - Users can add trucks, adjust rates, create custom fields

---

## 2. USER PERSONAS

### 2.1 Primary Persona: Marcus the Dispatcher

**Demographics:**
- Age: 35-50
- Role: Senior Dispatcher / Operations Manager
- Company: Mid-size heavy haul carrier (20-50 trucks)
- Location: Texas (but ships nationwide)
- Experience: 10+ years in freight

**Daily Workflow:**
1. 7:00 AM - Check emails for overnight load requests
2. 7:30 AM - Review each request, determine truck requirements
3. 8:00 AM - Check driver availability, assign loads
4. 9:00 AM - Generate quotes for new requests
5. 10:00 AM - Call permit services for oversize loads
6. Throughout day - Monitor active loads, handle issues
7. 4:00 PM - Follow up on pending quotes

**Pain Points:**
- Spends 2+ hours/day manually parsing emails
- Often misses dimensions buried in email threads
- Has to call permit companies to get accurate quotes
- Loses deals because quotes take too long
- New dispatchers take 6 months to learn truck selection

**Goals:**
- Quote loads in under 5 minutes (currently 30+ minutes)
- Never miss a dimension or weight specification
- Know exact permit costs before quoting
- Train new staff faster
- Win more bids with faster, accurate quotes

**Technical Proficiency:**
- Comfortable with email, basic web apps
- Uses smartphone for texts/calls
- Not comfortable with complex software
- Prefers simple, clear interfaces

**Success Metrics:**
- Time from email to quote < 5 minutes
- Quote accuracy > 95%
- Zero permit cost surprises
- New dispatcher onboarding < 2 weeks

---

### 2.2 Primary Persona: Sarah the Broker

**Demographics:**
- Age: 28-40
- Role: Freight Broker / Agent
- Company: 3PL or independent broker
- Location: Remote (works from home)
- Experience: 3-8 years in logistics

**Daily Workflow:**
1. 6:00 AM - Check load boards for opportunities
2. 7:00 AM - Send rate requests to carriers
3. 8:00 AM - Match loads with available trucks
4. 10:00 AM - Negotiate rates with shippers
5. 12:00 PM - Book confirmed loads
6. 2:00 PM - Track active shipments
7. 4:00 PM - Invoice and follow up

**Pain Points:**
- Doesn't own trucks, relies on carrier quotes
- Needs fast turnaround to win loads
- Shippers expect instant pricing
- Loses margin when permits cost more than expected
- Can't verify if carrier is using right truck type

**Goals:**
- Get accurate all-in pricing instantly
- Verify carrier truck recommendations
- Build margin confidence into quotes
- Track historical lane pricing
- Reduce back-and-forth with carriers

**Technical Proficiency:**
- Very comfortable with web apps
- Uses multiple monitors
- Quick learner
- Expects modern, fast interfaces

**Success Metrics:**
- All-in quote generation < 2 minutes
- Margin protection > 10%
- Lane history available instantly
- Zero permit surprises after booking

---

### 2.3 Secondary Persona: Danny the Driver

**Demographics:**
- Age: 40-60
- Role: Owner-Operator or Company Driver
- Company: Self-employed or employed by carrier
- Location: On the road (nationwide)
- Experience: 15+ years driving heavy haul

**Daily Workflow:**
1. 5:00 AM - Pre-trip inspection
2. 6:00 AM - Review load details, route
3. All day - Drive, handle checkpoints, permits
4. Evening - Log hours, plan next day

**Pain Points:**
- Gets incomplete load information
- Route sent doesn't account for low bridges
- Permit paperwork is confusing
- Doesn't know where to pick up escorts
- Scale houses question permit validity

**Goals:**
- Clear, complete load specifications
- Route that actually works for his truck
- All permits organized in one place
- Escort coordination handled for him
- Zero surprises at weigh stations

**Technical Proficiency:**
- Uses smartphone constantly
- Prefers apps over websites
- Needs large text, simple interface
- Often has poor cell service

**Success Metrics:**
- Zero bridge strikes
- All permits valid at checkpoints
- Escort coordination seamless
- Load info accessible offline

---

### 2.4 Secondary Persona: Carlos the Owner

**Demographics:**
- Age: 45-60
- Role: Business Owner / Fleet Manager
- Company: Owns the heavy haul company
- Location: Office-based with travel
- Experience: 20+ years in industry

**Daily Workflow:**
1. 8:00 AM - Review overnight activity
2. 9:00 AM - Check financial reports
3. 10:00 AM - Customer calls
4. 12:00 PM - Equipment/maintenance issues
5. 2:00 PM - Sales and business development
6. 4:00 PM - Approve quotes, review margins

**Pain Points:**
- Can't see profitability by customer/lane
- Permit costs eating into margins
- No visibility into quote conversion rates
- Staff makes pricing mistakes
- Can't forecast revenue accurately

**Goals:**
- Real-time business dashboard
- Profitability analysis by lane/customer
- Quote approval workflow
- Margin protection rules
- Revenue forecasting

**Technical Proficiency:**
- Comfortable with business software
- Expects reports and dashboards
- Uses laptop and phone
- Delegates technical setup

**Success Metrics:**
- Gross margin > 15%
- Quote-to-book ratio > 30%
- Zero unprofitable loads (knowingly)
- Monthly revenue predictable ±10%

---

### 2.5 Edge Persona: Nina the New Hire

**Demographics:**
- Age: 22-30
- Role: Junior Dispatcher / Operations Assistant
- Company: Any size carrier
- Location: Office-based
- Experience: < 2 years in freight

**Pain Points:**
- Doesn't know truck types
- Can't read email specifications correctly
- Afraid to quote wrong
- Senior staff too busy to train
- Makes mistakes that cost money

**Goals:**
- System guides correct decisions
- Learn truck selection from AI suggestions
- Confidence in quotes generated
- Reduce errors to near-zero
- Become productive quickly

**Success Metrics:**
- Productive in < 2 weeks
- Error rate < 5%
- Can handle standard loads independently
- System catches mistakes before submission

---

### 2.6 Edge Persona: Tom the Permit Specialist

**Demographics:**
- Age: 30-50
- Role: Permit Coordinator
- Company: Large carrier or permit service
- Location: Office-based
- Experience: 5+ years with permits

**Daily Workflow:**
1. All day - Process permit applications
2. Track permit status
3. Coordinate with state DOTs
4. Update internal databases
5. Handle permit emergencies

**Pain Points:**
- Manual data entry into state portals
- Keeping track of 50 state requirements
- Rates change and info goes stale
- Coordination with escorts
- Rush permit requests

**Goals:**
- Accurate, up-to-date permit database
- Reduce manual state portal work
- Escort scheduling integrated
- Historical permit lookup
- Rush permit workflow

**Success Metrics:**
- Permit data accuracy > 99%
- Processing time < 30 min per permit
- Zero rejected applications
- Escort availability confirmed before booking

---

## 3. COMPETITIVE ANALYSIS

### 3.1 Direct Competitors

#### Oversize.io
- **What they do:** Permit cost calculations, route planning
- **Pricing:** $49-199/month
- **Strengths:** Good permit database, established brand
- **Weaknesses:** No email parsing, clunky interface, expensive, no AI
- **Our advantage:** AI-powered automation, better UX, self-owned data

#### PermitVision
- **What they do:** Permit management and tracking
- **Pricing:** $75-300/month
- **Strengths:** Strong permit workflow, state integrations
- **Weaknesses:** Permit-only (no truck selection), complex setup
- **Our advantage:** End-to-end workflow, simpler, includes truck selection

#### Heavy Haul Soft
- **What they do:** Full TMS for heavy haul
- **Pricing:** $500-2000/month
- **Strengths:** Comprehensive features
- **Weaknesses:** Legacy software, expensive, steep learning curve
- **Our advantage:** Modern, affordable, AI-powered, faster to learn

#### LoadPilot
- **What they do:** Load planning and optimization
- **Pricing:** $99-299/month  
- **Strengths:** Good load optimization
- **Weaknesses:** Weak permit support, no email parsing
- **Our advantage:** Better permit integration, AI email parsing

### 3.2 Indirect Competitors

| Competitor | Category | Threat Level | Our Response |
|------------|----------|--------------|--------------|
| Excel/Sheets | DIY tracking | Medium | Too manual, we automate |
| Generic TMS (TMW, McLeod) | Enterprise TMS | Low | Too expensive, not specialized |
| Load boards (DAT, Truckstop) | Load matching | Low | Different use case, complementary |
| Permit services (TTS, Specialized) | Human services | Medium | We reduce need for calls |

### 3.3 Feature Comparison Matrix

| Feature | Load Planner | Oversize.io | PermitVision | Heavy Haul Soft |
|---------|--------------|-------------|--------------|-----------------|
| AI Email Parsing | ✅ | ❌ | ❌ | ❌ |
| Truck Selection | ✅ | ⚠️ Basic | ❌ | ✅ |
| Permit Calculations | ✅ | ✅ | ✅ | ✅ |
| Route Planning | ✅ | ✅ | ⚠️ Limited | ✅ |
| Low Clearance Check | ✅ | ⚠️ Manual | ❌ | ⚠️ Basic |
| Escort Coordination | ✅ | ⚠️ Info only | ⚠️ Basic | ✅ |
| Quote Generation | ✅ | ⚠️ Basic | ❌ | ✅ |
| Customer Management | ✅ | ❌ | ❌ | ✅ |
| Mobile App | ✅ (PWA) | ⚠️ Basic | ❌ | ❌ |
| Natural Language Search | ✅ | ❌ | ❌ | ❌ |
| Modern UI | ✅ | ⚠️ | ⚠️ | ❌ |
| Self-hosted option | 🔜 | ❌ | ❌ | ✅ |
| **Price** | $29-99/mo | $49-199/mo | $75-300/mo | $500-2000/mo |

---

## 4. FEATURE PRIORITIZATION (MoSCoW)

### 4.1 MUST HAVE (MVP - Phase 1-2)

These features are **non-negotiable** for launch:

| Feature | Description | Persona Need |
|---------|-------------|--------------|
| Email/Text Paste Parsing | Paste load email, extract structured data | Marcus, Sarah |
| Unit Conversion | Auto-convert inches↔feet, tons↔lbs | All |
| Truck Type Selection | Recommend flatbed/step deck/RGN/lowboy | Marcus, Nina |
| Dimensional Analysis | Calculate overall height, width, length | All |
| Permit Requirement Flags | Flag when load exceeds legal limits | All |
| Basic Route (A to B) | Get mileage and basic route | Marcus, Sarah |
| State Detection | Identify which states route crosses | Marcus |
| Permit Cost Lookup | Base permit fees per state | Marcus, Sarah |
| Simple Quote Output | Generate cost breakdown | Marcus, Sarah |

### 4.2 SHOULD HAVE (MVP Enhancement - Phase 2-3)

These features significantly improve value:

| Feature | Description | Persona Need |
|---------|-------------|--------------|
| Route Clearance Check | Flag low bridges on route | Danny |
| Escort Requirements | Show when escorts needed | Marcus, Tom |
| Escort Cost Estimates | Calculate escort costs | Marcus, Sarah |
| Customer Database | Store customer contacts | Marcus, Carlos |
| Quote History | Track past quotes | Marcus, Carlos |
| PDF Quote Generation | Professional quote documents | Sarah |
| Load/Quote CRUD | Create, edit, delete loads | All |
| User Authentication | Login, user accounts | All |
| Basic Dashboard | Overview of activity | Marcus, Carlos |

### 4.3 COULD HAVE (Post-MVP - Phase 3-4)

These features add significant value but can wait:

| Feature | Description | Persona Need |
|---------|-------------|--------------|
| Multi-item Loads | Handle loads with multiple pieces | Marcus |
| Stacking Optimizer | Optimize cargo placement | Marcus |
| Securement Calculator | Chain/strap requirements | Marcus, Danny |
| Image/PDF Upload Parsing | Extract from images/PDFs | Marcus |
| Natural Language Search | "Show Texas loads this week" | Marcus, Carlos |
| Analytics Dashboard | Profitability, conversion rates | Carlos |
| Quote Approval Workflow | Owner approval before send | Carlos |
| Email Quote Sending | Send quotes via email | Sarah |
| CRM Integration | Sync with Salesforce, HubSpot | Carlos |
| Webhook API | External integrations | Developers |

### 4.4 WON'T HAVE (Out of Scope for V1)

These features are explicitly deferred:

| Feature | Reason |
|---------|--------|
| Full TMS functionality | Too broad, focus on core |
| Driver mobile app | Phase 5+ |
| Automated permit filing | Requires state API access |
| Real-time GPS tracking | Different product |
| Accounting integration | Phase 5+ |
| Multi-language support | US market first |
| Load board integration | Phase 5+ |

---

## 5. SUCCESS METRICS

### 5.1 Phase 1 Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Email parse accuracy | > 90% | Manual verification |
| Truck recommendation accuracy | > 95% | Against expert judgment |
| Time to truck recommendation | < 3 seconds | Page load timing |
| User can complete flow | 100% | Usability test |

### 5.2 Phase 2 Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Route generation success | > 99% | API success rate |
| State detection accuracy | 100% | Against known routes |
| Permit cost accuracy | ±10% | Against actual permits |
| Clearance check catches issues | > 95% | Against known problems |

### 5.3 Overall Product Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time from email to quote | < 5 minutes | User tracking |
| Quote accuracy | > 95% | Post-trip reconciliation |
| User retention (monthly) | > 80% | Analytics |
| NPS score | > 50 | Surveys |
| Quote-to-book ratio | > 30% | Conversion tracking |

---

## 6. ASSUMPTIONS & RISKS

### 6.1 Key Assumptions

| Assumption | Impact if Wrong | Mitigation |
|------------|-----------------|------------|
| Users will paste emails (not forward) | Need email integration | Build email ingestion in Phase 4 |
| Gemini API will parse accurately | Core feature fails | Fallback to manual entry, prompt tuning |
| State permit data is stable | Frequent updates needed | Build admin interface for updates |
| Geoapify routing works for trucks | Routes incorrect | Fallback to Google Maps API |
| Low Clearance Map API is reliable | Miss low bridges | Build secondary data source |
| Users pay $29-99/month | No revenue | Adjust pricing, add free tier |

### 6.2 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI hallucination in parsing | Medium | High | Validation rules, confidence scores |
| Routing API rate limits | Low | Medium | Caching, batch processing |
| Database scale issues | Low | High | Start with indexed queries, optimize later |
| Permit data goes stale | High | Medium | Update schedule, user feedback |
| Clerk outage | Low | High | Design for graceful degradation |

### 6.3 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Competition copies features | Medium | Medium | Speed to market, continuous innovation |
| Permit regulations change | High | Low | Designed for updates |
| Industry downturn | Medium | High | Low burn rate, multiple revenue streams |
| Key person dependency | High | High | Documentation, AI assistance |

---

## 7. NEXT STEPS

This Discovery & Scoping document provides the foundation for:

1. **Part 2: Technical Architecture** - System design based on these requirements
2. **Part 3: Database Schema** - Tables derived from feature requirements
3. **Part 4: Screen Catalog** - UI based on persona workflows
4. **Part 5: Development Roadmap** - Timeline based on MoSCoW priorities

---

*End of Part 1: Discovery & Scoping*
