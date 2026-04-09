# Long Health — Phase 1 Sprint PRD
## Free Blood Report Analysis + Dashboard

**Version:** 1.0 | **Date:** April 2026 | **Status:** Ready for Development

---

## 1. Product Vision

**One-sentence:** Long Health gives every Indian instant, AI-powered understanding of their blood reports — for free — through a beautiful dashboard that turns lab PDFs into actionable health intelligence.

**Phase 1 Goal:** Launch a free blood report analysis tool on Android, iOS, and Web that processes uploaded PDF lab reports, extracts biomarkers via OCR, runs AI analysis using optimal (functional) ranges, and presents results in an interactive dashboard — all within 90 days.

---

## 2. Problem Statement

Indian consumers receive blood test reports as static PDFs from labs like Thyrocare, SRL, Dr Lal PathLabs, and Metropolis. These reports list values with lab reference ranges but provide no interpretation, no trend tracking, no prioritization of concerns, and no actionable recommendations. Consumers either ignore abnormal values, self-diagnose via Google, or pay ₹500-1500 for a doctor visit just to understand their report.

**Key gaps Phase 1 solves:**
- No free tool to intelligently interpret blood reports for Indian consumers
- Lab "normal" ranges are wide — functional/optimal ranges catch problems earlier
- No longitudinal tracking across multiple reports
- No AI-powered, personalized health recommendations grounded in actual biomarker data
- Existing global tools (BloodGPT, Kantesti) don't understand Indian lab formats or dietary context

---

## 3. Target Users

### Primary Persona: Health-Curious Urban Indian
- **Age:** 25-50
- **Location:** Metros and Tier-1 cities
- **Behavior:** Gets annual blood tests, receives PDF report, doesn't fully understand it
- **Device:** Android (95% priority), some iOS
- **Motivation:** "I just got my blood test results — what do they actually mean?"

### Secondary Persona: Family Health Manager
- **Age:** 30-55
- **Behavior:** Manages health reports for parents (diabetes, thyroid) and family
- **Motivation:** "My father has multiple myeloma history — I need to track his markers over time"

### Anti-Persona (NOT Phase 1)
- Doctors or clinicians (no B2B features)
- Lab partners (no integration yet)
- Users seeking diagnosis (we provide insights, not diagnosis)

---

## 4. Feature Scope — MoSCoW Prioritization

### MUST HAVE (Phase 1 MVP — Ship in 90 days)

| # | Feature | Description |
|---|---------|-------------|
| M1 | Phone OTP Sign-up | Phone number + OTP authentication (Indian mobile numbers) |
| M2 | PDF Report Upload | Upload blood test PDF from device or camera capture |
| M3 | OCR + Biomarker Extraction | Parse common Indian lab report formats (Thyrocare, SRL, Dr Lal, Metropolis, generic) |
| M4 | AI Analysis Engine | Analyze extracted biomarkers using functional/optimal ranges, not just lab ranges |
| M5 | Health Dashboard | Interactive dashboard showing all biomarkers with color-coded status (optimal/borderline/critical) |
| M6 | Organ System Scoring | Group biomarkers by system (liver, kidney, thyroid, metabolic, blood, nutrients) with health scores |
| M7 | Prioritized Concerns | AI-generated list of health concerns ranked by severity |
| M8 | Basic Recommendations | Diet, lifestyle, and supplement recommendations based on biomarker gaps |
| M9 | Report History | Store multiple reports, show longitudinal trends |
| M10 | PDF Download | Export analysis as shareable PDF summary |
| M11 | Basic Profile | Name, age, gender, height, weight (affects reference ranges) |

### SHOULD HAVE (Ship in 90 days if time permits)

| # | Feature | Description |
|---|---------|-------------|
| S1 | WhatsApp Share | Share health summary card via WhatsApp |
| S2 | Multi-language | Hindi language toggle for dashboard and recommendations |
| S3 | Family Profiles | Add family members, upload their reports separately |
| S4 | Push Notifications | Retest reminders ("Retest Vitamin D in 3 months") |
| S5 | Dark Mode | System-preference or manual toggle |

### COULD HAVE (Nice to have, defer if needed)

| # | Feature | Description |
|---|---------|-------------|
| C1 | Biological Age | Composite age calculation from biomarkers |
| C2 | Camera OCR | Photograph printed report for upload |
| C3 | Onboarding Quiz | Health history questionnaire to personalize analysis |

### WON'T HAVE (Phase 1 — explicitly deferred)

| Feature | Reason | Phase |
|---------|--------|-------|
| AI Chat | Significant additional complexity, needs RAG pipeline | Phase 1.5 |
| Lab Booking | Requires partnership agreements | Phase 2 |
| Payment/Subscriptions | Free-only in Phase 1 | Phase 2 |
| Clinician Review | Requires physician network | Phase 2 |
| Wearable Integration | Nice-to-have, not core | Phase 3 |
| Corporate Plans | B2B requires different GTM | Phase 3 |

---

## 5. User Stories & Acceptance Criteria

### US-1: User Sign-up (M1)
**As a** new user, **I want to** sign up with my phone number, **so that** I can securely access my health data.

**Acceptance Criteria:**
- Given I open the app, When I enter a valid Indian mobile number (+91), Then I receive an OTP via SMS within 30 seconds
- Given I receive the OTP, When I enter the correct 6-digit code, Then I am logged in and directed to the onboarding screen
- Given I enter an incorrect OTP, When I submit, Then I see an error message and can retry (max 3 attempts)
- Given I am a returning user, When I log in, Then I see my existing dashboard with all uploaded reports

### US-2: PDF Report Upload (M2)
**As a** user, **I want to** upload my blood test PDF, **so that** I can get an AI-powered analysis.

**Acceptance Criteria:**
- Given I am on the dashboard, When I tap "Upload Report", Then I can select a PDF file from my device storage
- Given I select a valid lab report PDF, When the upload completes, Then I see a processing indicator ("Analyzing your report...")
- Given the PDF is uploaded, When processing completes (< 60 seconds), Then I am shown the extracted biomarkers for review
- Given the PDF is not a valid lab report, When processing fails, Then I see a clear error message with instructions to try again
- Given my file is > 10MB, When I try to upload, Then I see a file size limit message

### US-3: Biomarker Extraction (M3)
**As a** user, **I want** my blood report to be automatically parsed, **so that** I don't have to manually enter values.

**Acceptance Criteria:**
- Given a PDF from Thyrocare/SRL/Dr Lal/Metropolis, When processed, Then ≥90% of biomarkers are correctly extracted with name, value, and unit
- Given an extracted biomarker list, When displayed, Then user can review, correct any misread values, and confirm
- Given a generic/unrecognized lab format, When processed, Then best-effort extraction is attempted with a prompt to manually verify
- Given a non-lab PDF (prescription, invoice), When processed, Then system identifies it's not a lab report and shows an appropriate message

### US-4: AI Health Analysis (M4)
**As a** user, **I want** AI-powered analysis of my blood results, **so that** I understand what my numbers mean for my health.

**Acceptance Criteria:**
- Given confirmed biomarker values, When analysis runs, Then each biomarker is evaluated against both lab reference ranges AND functional/optimal ranges
- Given the analysis is complete, When displayed, Then each biomarker shows: value, unit, lab range, optimal range, and status (optimal/borderline/out-of-range)
- Given the user's age and gender, When analysis runs, Then reference ranges are adjusted accordingly
- Given out-of-range values exist, When analysis completes, Then an AI-generated summary explains potential causes and implications in plain language

### US-5: Interactive Health Dashboard (M5)
**As a** user, **I want** a visual dashboard of my health data, **so that** I can quickly understand my overall health status.

**Acceptance Criteria:**
- Given analysis is complete, When I view the dashboard, Then I see an overview with color-coded biomarker cards (green = optimal, amber = borderline, red = out of range)
- Given I tap a biomarker card, When the detail view opens, Then I see: current value, trend chart (if multiple reports), optimal range band, and AI explanation
- Given I have multiple reports uploaded, When I view a biomarker, Then I see a trend line showing how this value has changed over time
- Given I am on the dashboard, When I scroll, Then I see biomarkers grouped by organ system (liver, kidney, thyroid, metabolic, blood, nutrients)

### US-6: Organ System Health Scores (M6)
**As a** user, **I want** to see health scores for each organ system, **so that** I know which areas need attention.

**Acceptance Criteria:**
- Given my biomarkers are analyzed, When I view the dashboard, Then I see a scored card (0-100) for each organ system: Liver, Kidney, Thyroid, Metabolic/Diabetes, Blood/Anemia, Heart, Nutrients
- Given a system score is below 70, When displayed, Then it is highlighted amber with a brief explanation
- Given a system score is below 50, When displayed, Then it is highlighted red with urgent attention messaging

### US-7: Prioritized Health Concerns (M7)
**As a** user, **I want** to see my top health concerns ranked by importance, **so that** I know what to focus on first.

**Acceptance Criteria:**
- Given my analysis is complete, When I view the "Concerns" section, Then I see up to 5 prioritized health concerns with severity indicators
- Given each concern, When displayed, Then it includes: title, affected biomarkers, risk level, brief explanation, and recommended action
- Given no concerning values, When displayed, Then I see a positive "All clear" message with general wellness tips

### US-8: Personalized Recommendations (M8)
**As a** user, **I want** diet and lifestyle recommendations based on my results, **so that** I can take action to improve.

**Acceptance Criteria:**
- Given out-of-range biomarkers, When recommendations are generated, Then they include India-specific dietary suggestions (dal, green leafy vegetables, specific fruits, regional foods)
- Given supplement recommendations, When displayed, Then they reference brands available in India (Himalaya, HealthKart, etc.) with approximate pricing
- Given lifestyle recommendations, When displayed, Then they include practical suggestions (yoga, walking, specific exercises) with duration/frequency
- Given all biomarkers are optimal, When displayed, Then maintenance recommendations are shown

### US-9: Report History & Trends (M9)
**As a** user, **I want** to see all my past reports and track changes, **so that** I can monitor my health over time.

**Acceptance Criteria:**
- Given I have uploaded multiple reports, When I view "My Reports", Then I see a chronological list with date, lab name, and summary status
- Given I select a past report, When opened, Then I see the full analysis for that report
- Given I have 2+ reports, When viewing any biomarker detail, Then I see a trend chart showing all historical values with dates

### US-10: Export Analysis as PDF (M10)
**As a** user, **I want** to download my analysis as a PDF, **so that** I can share it with my doctor.

**Acceptance Criteria:**
- Given my analysis is complete, When I tap "Download PDF", Then a formatted PDF is generated with: summary, all biomarkers with status, concerns, and recommendations
- Given the PDF is generated, When opened, Then it includes the Long Health branding and a disclaimer ("This is not medical advice")

### US-11: User Profile (M11)
**As a** user, **I want** to set up my basic health profile, **so that** analysis is personalized to me.

**Acceptance Criteria:**
- Given I am a new user after OTP verification, When directed to onboarding, Then I can enter: name, date of birth, gender, height, weight
- Given my profile is set, When analysis runs, Then age-and-gender-specific reference ranges are applied
- Given I want to update my profile, When I go to Settings, Then I can edit all profile fields

---

## 6. Technical Architecture (Phase 1)

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Mobile App** | React Native (Expo) | Single codebase for Android + iOS, fastest to ship |
| **Web App** | Next.js 14 (App Router) | SSR, PWA support, shared component library with RN |
| **Backend API** | Node.js + Express | JavaScript everywhere, fast development |
| **Database** | PostgreSQL (AWS RDS) | ACID compliance, health data integrity |
| **Cache** | Redis (ElastiCache) | Session management, OTP storage, rate limiting |
| **File Storage** | AWS S3 | PDF uploads, generated report storage |
| **AI Analysis** | Claude API (Anthropic) | Best reasoning for medical analysis, structured output |
| **OCR** | Google Document AI or Tesseract | Extract text from PDF lab reports |
| **Auth** | Custom OTP (MSG91/Twilio) | Phone-based auth standard in India |
| **Push Notifications** | Firebase Cloud Messaging | Cross-platform push for Android + iOS |
| **Analytics** | PostHog (self-hosted) or Mixpanel | User behavior tracking, funnel analysis |
| **Error Monitoring** | Sentry | Crash reporting, performance monitoring |
| **CI/CD** | GitHub Actions | Automated build, test, deploy pipeline |

### Infrastructure (AWS Mumbai — ap-south-1)

```
┌─────────────────────────────────────────────────────────┐
│  CloudFront CDN                                          │
│  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │ Next.js Web App  │  │ React Native App (stores)    │ │
│  │ (Vercel or ECS)  │  │                              │ │
│  └────────┬─────────┘  └──────────────┬───────────────┘ │
│           │                           │                  │
│  ┌────────▼───────────────────────────▼──────────┐      │
│  │           API Gateway / ALB                    │      │
│  └────────────────────┬──────────────────────────┘      │
│                       │                                  │
│  ┌────────────────────▼──────────────────────────┐      │
│  │         Node.js API (ECS Fargate)             │      │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │      │
│  │  │ Auth     │ │ Report   │ │ Analysis     │  │      │
│  │  │ Service  │ │ Service  │ │ Service      │  │      │
│  │  └──────────┘ └──────────┘ └──────────────┘  │      │
│  └───┬──────────────┬──────────────┬─────────────┘      │
│      │              │              │                     │
│  ┌───▼───┐  ┌───────▼───┐  ┌──────▼──────┐             │
│  │Redis  │  │PostgreSQL │  │  S3 Bucket  │             │
│  │(OTP,  │  │(RDS)      │  │  (PDFs,     │             │
│  │cache) │  │           │  │   exports)  │             │
│  └───────┘  └───────────┘  └─────────────┘             │
│                                                         │
│  ┌──────────────────────────────────────────────┐      │
│  │  External Services                            │      │
│  │  ┌─────────┐ ┌─────────┐ ┌────────────────┐ │      │
│  │  │Claude   │ │MSG91/   │ │Google DocAI /  │ │      │
│  │  │API      │ │Twilio   │ │Tesseract OCR   │ │      │
│  │  └─────────┘ └─────────┘ └────────────────┘ │      │
│  └──────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/send-otp` | Send OTP to phone number |
| POST | `/api/auth/verify-otp` | Verify OTP, return JWT |
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/profile` | Update user profile |
| POST | `/api/reports/upload` | Upload PDF report |
| GET | `/api/reports` | List user's reports |
| GET | `/api/reports/:id` | Get report details + analysis |
| GET | `/api/reports/:id/biomarkers` | Get all biomarkers for a report |
| GET | `/api/biomarkers/:name/trends` | Get trend data for a specific biomarker |
| GET | `/api/dashboard` | Get dashboard summary (latest report) |
| GET | `/api/dashboard/concerns` | Get prioritized health concerns |
| GET | `/api/dashboard/recommendations` | Get personalized recommendations |
| GET | `/api/reports/:id/export` | Generate and download PDF export |
| POST | `/api/reports/:id/biomarkers/:bid` | Manually correct a biomarker value |

### Database Schema (Core Tables)

```sql
-- Users
users (
  id UUID PRIMARY KEY,
  phone VARCHAR(15) UNIQUE NOT NULL,
  name VARCHAR(100),
  date_of_birth DATE,
  gender VARCHAR(10),
  height_cm DECIMAL,
  weight_kg DECIMAL,
  language VARCHAR(5) DEFAULT 'en',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Reports
reports (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  lab_name VARCHAR(100),
  report_date DATE,
  pdf_s3_key VARCHAR(500),
  ocr_raw_text TEXT,
  status VARCHAR(20) DEFAULT 'processing', -- processing, analyzed, error
  analysis_json JSONB, -- full AI analysis output
  created_at TIMESTAMP DEFAULT NOW()
)

-- Biomarkers (extracted from reports)
biomarkers (
  id UUID PRIMARY KEY,
  report_id UUID REFERENCES reports(id),
  name VARCHAR(100) NOT NULL, -- e.g., "Hemoglobin", "Vitamin D"
  value DECIMAL NOT NULL,
  unit VARCHAR(30),
  lab_range_low DECIMAL,
  lab_range_high DECIMAL,
  optimal_range_low DECIMAL,
  optimal_range_high DECIMAL,
  status VARCHAR(20), -- optimal, borderline, low, high, critical
  category VARCHAR(50), -- liver, kidney, thyroid, metabolic, blood, nutrients, heart
  ai_explanation TEXT,
  manually_corrected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Indexes
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_user_date ON reports(user_id, report_date DESC);
CREATE INDEX idx_biomarkers_report_id ON biomarkers(report_id);
CREATE INDEX idx_biomarkers_name_user ON biomarkers(name, report_id);
```

---

## 7. Non-Functional Requirements

| Category | Requirement | Target |
|----------|-------------|--------|
| **Performance** | PDF upload + analysis complete | < 60 seconds |
| **Performance** | Dashboard load time | < 2 seconds |
| **Performance** | API response time (p95) | < 500ms |
| **Availability** | Uptime | 99.5% |
| **Security** | Data encryption at rest | AES-256 (S3 + RDS) |
| **Security** | Data encryption in transit | TLS 1.3 |
| **Security** | OTP expiry | 5 minutes |
| **Security** | Rate limiting | 5 OTP requests/phone/hour |
| **Scalability** | Concurrent users (Phase 1) | 1,000 |
| **Storage** | PDF retention | Indefinite (user data) |
| **Compliance** | Data residency | AWS Mumbai (ap-south-1) |
| **Compliance** | Medical disclaimer | Shown on every analysis page |
| **Accessibility** | WCAG | 2.1 AA minimum |
| **App Size** | Android APK | < 30MB |
| **Offline** | View cached dashboard | Previously loaded data available offline |

---

## 8. Success Metrics (Phase 1 — 90 days)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Total Users | 10,000 | Registered accounts |
| Reports Uploaded | 25,000 | Total PDFs processed |
| OCR Accuracy | ≥ 90% | Correct biomarker extraction rate |
| DAU/MAU Ratio | > 15% | Daily engagement |
| Report Upload Completion | > 80% | Upload started → analysis viewed |
| App Store Rating | > 4.3 | Google Play + App Store |
| Organic Referral Rate | > 20% | Users acquired via sharing |
| Error Rate | < 2% | Failed uploads / total uploads |

---

## 9. Risks & Assumptions

### Assumptions
1. Users will trust AI health analysis if we include clear disclaimers and source citations
2. Common Indian lab report formats are parseable via OCR with reasonable accuracy
3. Free tool will drive viral sharing (WhatsApp, word of mouth)
4. Claude API costs per analysis (~$0.02-0.05) are sustainable at free tier for 10K users (~$200-500/month)
5. Phone OTP is sufficient for auth (no email needed in India)

### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| OCR fails on non-standard formats | High | Medium | Manual correction UI + fallback to user input |
| AI provides inaccurate health info | Critical | Low | Guardrails, source citations, prominent disclaimer |
| Regulatory pushback (DISHA Act) | High | Low | "Insights not diagnosis" positioning, medical advisor |
| Claude API cost overrun | Medium | Low | Cache common analyses, batch processing, cost monitoring |
| Low user retention after first upload | Medium | High | Retest reminders, trend tracking, family features |

---

## 10. Medical Disclaimer (Required on all screens)

> **Disclaimer:** Long Health provides health insights and educational information based on your lab reports. This is not medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for medical decisions. AI-generated analysis is for informational purposes only and should not replace professional medical guidance.

---

## 11. Out of Scope — Explicitly Deferred

- AI conversational chat (Phase 1.5)
- Lab test booking or ordering (Phase 2)
- Payment processing or subscriptions (Phase 2)
- Clinician/doctor review of reports (Phase 2)
- Wearable device integration (Phase 3)
- Corporate/enterprise features (Phase 3)
- Teleconsultation (Phase 3)
- ABHA/NDHM integration (Phase 3)

---

## 12. Definition of Done

A feature is "done" when:
1. Code is written, reviewed, and merged
2. Unit tests pass with > 80% coverage
3. Works on Android, iOS, and Web
4. Accessible (screen reader tested)
5. Error states handled gracefully
6. Analytics events tracked
7. No P0/P1 bugs open
