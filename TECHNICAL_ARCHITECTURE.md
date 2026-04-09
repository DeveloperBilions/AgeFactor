# Long Health Phase 1 MVP — Technical Architecture Document

**Version:** 1.0  
**Date:** April 2026  
**Status:** Production Ready  
**Author:** AI-Assisted Development Team  
**Scope:** Free blood report analysis platform (MVP)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Tech Stack Decision Matrix](#tech-stack-decision-matrix)
3. [Component Design](#component-design)
4. [API Design](#api-design)
5. [Authentication Flow](#authentication-flow)
6. [Report Processing Pipeline](#report-processing-pipeline)
7. [AI Analysis Pipeline](#ai-analysis-pipeline)
8. [Security Architecture](#security-architecture)
9. [Infrastructure & Deployment](#infrastructure--deployment)
10. [Cost Estimation](#cost-estimation)
11. [Scalability Plan](#scalability-plan)
12. [Monitoring & Observability](#monitoring--observability)
13. [Team & Development Workflow](#team--development-workflow)

---

## System Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                   │
├──────────────────────────┬──────────────────────────┬───────────────────┤
│  React Native App        │   Next.js Web (PWA)      │  Mobile Browser   │
│  (Expo - Android/iOS)    │   (Desktop/Tablet)       │  (Android/iOS)    │
└───────────────┬──────────┴──────────────┬───────────┴─────────┬─────────┘
                │                         │                     │
                │         HTTP/HTTPS      │                     │
                └─────────────────────────┼─────────────────────┘
                                          ▼
                    ┌──────────────────────────────────────────┐
                    │     CloudFront CDN (Static Assets)       │
                    └──────────────────────────────────────────┘
                                          │
                ┌─────────────────────────┴──────────────────────┐
                │                                                │
                ▼                                                ▼
        ┌──────────────────┐                            ┌──────────────────┐
        │  API Gateway /   │                            │  Static Content  │
        │  Load Balancer   │                            │  (Next.js Build) │
        └────────┬─────────┘                            └──────────────────┘
                 │
                 ▼
        ┌──────────────────────────────────────────────┐
        │     ECS Fargate Cluster (ap-south-1)         │
        │  ┌────────────────────────────────────────┐  │
        │  │  Node.js/Express API Services          │  │
        │  │  ┌──────────────────────────────────┐  │  │
        │  │  │ • Auth Service (OTP/JWT)         │  │  │
        │  │  │ • Report Service (Upload/OCR)    │  │  │
        │  │  │ • Analysis Service (Claude API)  │  │  │
        │  │  │ • Dashboard Service (Data Agg)   │  │  │
        │  │  │ • Export Service (PDF Gen)       │  │  │
        │  │  └──────────────────────────────────┘  │  │
        │  └────────────────────────────────────────┘  │
        └──────┬──────────────────────┬────────────────┘
               │                      │
               ▼                      ▼
        ┌─────────────────┐   ┌──────────────────┐
        │  AWS RDS        │   │  ElastiCache     │
        │  PostgreSQL     │   │  (Redis)         │
        │  (Mumbai)       │   │  Session/Cache   │
        └─────────────────┘   └──────────────────┘
               │
               └─────┬──────────────┬─────────────┐
                     │              │             │
                     ▼              ▼             ▼
            ┌─────────────────┐ ┌──────────┐ ┌─────────────┐
            │  AWS S3 (PDFs)  │ │ MSG91/   │ │ Claude API  │
            │  (Encrypted)    │ │ Twilio   │ │ (Analysis)  │
            └─────────────────┘ └──────────┘ └─────────────┘
                     │
                     ▼
            ┌─────────────────┐
            │  Google Doc AI  │
            │  or Tesseract   │
            │  (OCR Service)  │
            └─────────────────┘

        ┌──────────────────────────────────────┐
        │     Monitoring & Analytics           │
        │  • Sentry (Error tracking)           │
        │  • PostHog (Product analytics)       │
        │  • CloudWatch (Infrastructure logs)  │
        └──────────────────────────────────────┘
```

### System Communication Flow

```mermaid
graph LR
    A["Mobile/Web Client"] -->|POST /auth/send-otp| B["Auth Service"]
    B -->|SMS| C["MSG91/Twilio"]
    A -->|POST /auth/verify-otp| B
    B -->|JWT Token| A
    A -->|POST /reports/upload| D["Report Service"]
    D -->|S3| E["AWS S3"]
    D -->|Queue Job| F["BullMQ"]
    F -->|Process| G["OCR Service"]
    G -->|Extract Text| H["Biomarker Parser"]
    H -->|Queue| F
    F -->|Process| I["Analysis Service"]
    I -->|API Call| J["Claude API"]
    I -->|Store| K["PostgreSQL"]
    K -->|Cache| L["Redis"]
    A -->|GET /dashboard| M["Dashboard Service"]
    M -->|Query| K
    M -->|Cache Hit| L
    A -->|GET /export/:reportId| N["Export Service"]
    N -->|PDF Generate| O["Result PDF"]
```

### Component Interactions

| Component | Depends On | Protocol | Purpose |
|-----------|-----------|----------|---------|
| Auth Service | Redis, PostgreSQL | REST, SMS | User authentication & session management |
| Report Service | S3, PostgreSQL, BullMQ | REST, AWS SDK | Upload & storage orchestration |
| OCR Service | Google Doc AI/Tesseract, S3 | REST, SDK | Extract biomarker values from PDFs |
| Analysis Service | Claude API, PostgreSQL, Redis | REST, HTTP | Generate health insights |
| Dashboard Service | PostgreSQL, Redis | REST, SQL | Aggregate & compute user metrics |
| Export Service | PostgreSQL, PDF-lib | REST, SDK | Generate downloadable reports |

---

## Tech Stack Decision Matrix

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Frontend (Mobile)** | React Native (Expo) | Cross-platform (iOS/Android) with single codebase; hot reload speeds development; ideal for health apps; Bilions team expertise. |
| **Frontend (Web)** | Next.js 14 + TypeScript | SSR for SEO, PWA support for offline access, built-in image optimization, API routes for lightweight backend, strong TypeScript ecosystem. |
| **Backend** | Node.js + Express | Lightweight, event-driven, perfect for async OCR/AI pipelines; JavaScript fullstack reduces cognitive load for small team; massive npm ecosystem. |
| **Database** | PostgreSQL 15 (AWS RDS) | ACID guarantees for medical data, excellent JSON support for biomarker storage, full-text search for medical terms, proven for healthcare. |
| **Cache/Queue** | Redis (ElastiCache) | Sub-millisecond access for session tokens & biomarker ranges, native support for job queues (BullMQ), built-in rate limiting. |
| **OCR** | Google Document AI (primary) | Higher accuracy on medical documents (~95%), handles tables & structured data; fallback to Tesseract for cost optimization. |
| **AI Analysis** | Claude API | Superior medical reasoning, structured JSON output, 200K context window for complex reports, pay-as-you-go. |
| **Authentication** | Phone OTP | Lowest friction for Indian users (90% have basic phones), no app store account required, compliance-friendly (no password storage). |
| **SMS Provider** | MSG91 (primary) | India-focused, highest delivery rates, cheapest SMS (~₹0.30/msg), native Hindi support. |
| **Storage** | AWS S3 (ap-south-1) | Encryption at rest, DPDPA-compliant, Mumbai region (low latency), versioning for audit trails. |
| **Compute** | ECS Fargate | Serverless containers, pay-per-second, no infrastructure management, easy horizontal scaling. |
| **CDN** | CloudFront | Caches static assets & API responses, DDoS protection, integrates with S3, 50% cheaper than competitors for India traffic. |
| **Monitoring** | Sentry + PostHog | Sentry: real-time error tracking with stack traces; PostHog: funnel analysis for signup/upload/analysis conversion. |
| **CI/CD** | GitHub Actions | Free for open-source, native GitHub integration, easy secret management, 20min builds acceptable for MVP. |

---

## Component Design

### 1. Auth Service (Authentication & Session Management)

**Responsibilities:**
- Send OTP via SMS (MSG91/Twilio)
- Verify OTP and validate tokens
- Issue JWT access tokens (7-day expiry)
- Manage refresh tokens (30-day expiry)
- Rate limiting per phone number
- Session invalidation on logout

**Key Files:**
```
backend/services/auth/
├── controllers/authController.ts     # Route handlers
├── middleware/otpLimiter.ts         # Rate limit OTP sends
├── middleware/jwtAuth.ts            # JWT validation
├── models/User.ts                   # User schema
├── models/OtpSession.ts             # OTP tracking
├── utils/jwtUtils.ts                # Token generation
├── utils/smsClient.ts               # MSG91/Twilio wrapper
└── routes/authRoutes.ts             # Express routes
```

**Configuration:**
```javascript
// .env
OTP_EXPIRY_SECONDS=300              // 5 minutes
JWT_EXPIRY_DAYS=7
REFRESH_TOKEN_EXPIRY_DAYS=30
MAX_OTP_PER_HOUR=5
SMS_PROVIDER=msg91                  // or twilio
MSG91_AUTH_KEY=<key>
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<token>
```

---

### 2. Report Service (Upload & OCR Pipeline)

**Responsibilities:**
- Handle PDF file uploads (max 50MB)
- Validate file type & integrity
- Upload to AWS S3 with encryption
- Queue OCR extraction job
- Track processing status
- Store report metadata

**Key Files:**
```
backend/services/report/
├── controllers/reportController.ts  # Upload handlers
├── middleware/fileValidation.ts     # PDF validation
├── models/Report.ts                 # Report schema
├── models/ReportPage.ts             # Page-level extraction
├── utils/s3Client.ts                # AWS S3 integration
├── utils/jobQueue.ts                # BullMQ setup
├── jobs/ocrJob.ts                   # OCR processing
└── routes/reportRoutes.ts           # Express routes
```

**Upload Flow:**
```
POST /reports/upload
├─ Validate file (PDF, <50MB)
├─ Generate unique reportId
├─ Upload to S3: s3://long-health-pdfs/{userId}/{reportId}.pdf
├─ Store metadata in PostgreSQL
├─ Queue OCR job with BullMQ
├─ Return 202 Accepted with status URL
│
OCR Job (Async):
├─ Fetch PDF from S3
├─ Call Google Document AI or Tesseract
├─ Extract raw text & tables
├─ Store extracted_text in PostgreSQL
├─ Update report.status = "extracted"
├─ Queue Analysis job
└─ Notify user via push notification
```

---

### 3. Analysis Service (Claude API Integration)

**Responsibilities:**
- Build analysis prompts from extracted biomarkers
- Call Claude API with structured output
- Parse & validate Claude response
- Store analysis results
- Generate health recommendations
- Cache similar analyses

**Key Files:**
```
backend/services/analysis/
├── controllers/analysisController.ts
├── models/Analysis.ts
├── models/Biomarker.ts              # Biomarker reference data
├── utils/claudeClient.ts            # Claude API wrapper
├── utils/promptBuilder.ts           # Prompt construction
├── utils/responseParser.ts          # Claude response parsing
├── jobs/analysisJob.ts              # Async analysis
├── data/biomarkerRanges.json        # Reference ranges
└── routes/analysisRoutes.ts
```

**Biomarker Reference Data Structure:**
```json
{
  "biomarkers": [
    {
      "code": "RBC",
      "name": "Red Blood Cell Count",
      "unit": "million/mcL",
      "reference_ranges": {
        "male": {"min": 4.5, "max": 6.0, "optimal": 5.2},
        "female": {"min": 4.0, "max": 5.5, "optimal": 4.7}
      },
      "organ_system": "hematologic",
      "clinical_significance": "Oxygen carrying capacity"
    }
  ]
}
```

---

### 4. Dashboard Service (Data Aggregation & Trends)

**Responsibilities:**
- Aggregate all user reports
- Calculate organ system scores (0-100)
- Compute 30/90-day trends
- Generate health summary
- Cache computed metrics
- Handle first-time user flow

**Key Files:**
```
backend/services/dashboard/
├── controllers/dashboardController.ts
├── models/Dashboard.ts
├── utils/organSystemScorer.ts       # Scoring algorithm
├── utils/trendCalculator.ts         # Trend analysis
├── utils/cacheManager.ts            # Redis caching
└── routes/dashboardRoutes.ts
```

**Organ System Scoring:**
```javascript
// Scoring algorithm (0-100)
// Each organ system (cardiovascular, renal, hepatic, etc.)
// scored as weighted average of constituent biomarkers

scoreOrganSystem(biomarkers) {
  const weights = {
    hemoglobin: 0.3,
    hematocrit: 0.2,
    wbc: 0.2,
    platelets: 0.3
  };
  
  let score = 0;
  for (const [marker, weight] of Object.entries(weights)) {
    const normalizedValue = normalize(biomarkers[marker]);
    score += normalizedValue * weight;
  }
  return Math.round(score * 100);
}
```

---

### 5. Export Service (PDF Report Generation)

**Responsibilities:**
- Generate branded PDF reports
- Include all analyses & recommendations
- Add trend charts
- Provide download link
- Store generated PDFs (optional)

**Key Files:**
```
backend/services/export/
├── controllers/exportController.ts
├── utils/pdfGenerator.ts            # pdf-lib wrapper
├── templates/reportTemplate.ts      # PDF structure
├── routes/exportRoutes.ts
└── middleware/pdfHeaders.ts         # Download headers
```

---

## API Design

### API Endpoints (Complete Specification)

#### Authentication Endpoints

**1. Send OTP**
```
POST /api/v1/auth/send-otp
Content-Type: application/json

Request:
{
  "phone": "+919876543210"           // E.164 format
}

Response (200 OK):
{
  "success": true,
  "message": "OTP sent to phone number",
  "expiresIn": 300,                  // seconds
  "phone_masked": "+91987654****"
}

Response (429 Too Many Requests):
{
  "error": "rate_limit_exceeded",
  "message": "Maximum 5 OTPs per hour allowed",
  "retryAfter": 1800                 // seconds
}
```

**2. Verify OTP & Get Token**
```
POST /api/v1/auth/verify-otp
Content-Type: application/json

Request:
{
  "phone": "+919876543210",
  "otp": "123456"
}

Response (200 OK):
{
  "success": true,
  "user": {
    "id": "user_abc123",
    "phone": "+919876543210",
    "createdAt": "2026-04-08T10:30:00Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "ref_xyz789...",
    "expiresIn": 604800,             // 7 days in seconds
    "tokenType": "Bearer"
  }
}

Response (401 Unauthorized):
{
  "error": "invalid_otp",
  "message": "OTP is incorrect or expired"
}
```

**3. Refresh Token**
```
POST /api/v1/auth/refresh-token
Content-Type: application/json
Authorization: Bearer <refreshToken>

Response (200 OK):
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 604800
}
```

#### Report Endpoints

**4. Upload Blood Report PDF**
```
POST /api/v1/reports/upload
Content-Type: multipart/form-data
Authorization: Bearer <accessToken>

Form Data:
- file: <binary PDF file>
- reportDate: "2026-04-01"           // Optional: lab test date
- labName: "Apollo Diagnostics"      // Optional: lab name

Response (202 Accepted):
{
  "success": true,
  "reportId": "report_def456",
  "status": "processing",
  "message": "Report uploaded. Processing will take 2-5 minutes.",
  "statusUrl": "/api/v1/reports/report_def456/status",
  "estimatedTime": 180                // seconds
}

Response (400 Bad Request):
{
  "error": "invalid_file",
  "message": "File must be PDF, maximum 50MB"
}

Response (413 Payload Too Large):
{
  "error": "file_too_large",
  "message": "Maximum file size is 50MB"
}
```

**5. Get Report Status**
```
GET /api/v1/reports/{reportId}/status
Authorization: Bearer <accessToken>

Response (200 OK):
{
  "reportId": "report_def456",
  "status": "analyzing",             // extracting|analyzing|completed|failed
  "progress": 65,                    // 0-100
  "uploadedAt": "2026-04-08T10:00:00Z",
  "extractedBiomarkerCount": 45,
  "estimatedTimeRemaining": 120      // seconds
}
```

**6. Get Report Details**
```
GET /api/v1/reports/{reportId}
Authorization: Bearer <accessToken>

Response (200 OK):
{
  "reportId": "report_def456",
  "uploadedAt": "2026-04-08T10:00:00Z",
  "reportDate": "2026-04-01",
  "labName": "Apollo Diagnostics",
  "status": "completed",
  "biomarkers": [
    {
      "code": "RBC",
      "value": 5.2,
      "unit": "million/mcL",
      "referenceMin": 4.5,
      "referenceMax": 6.0,
      "status": "normal"              // normal|low|high
    },
    {
      "code": "WBC",
      "value": 7200,
      "unit": "/mcL",
      "referenceMin": 4500,
      "referenceMax": 11000,
      "status": "normal"
    }
  ],
  "analysis": {
    "id": "analysis_ghi789",
    "completedAt": "2026-04-08T10:05:00Z",
    "summary": "Your blood report shows healthy values overall...",
    "organSystems": {
      "hematologic": {
        "score": 85,
        "assessment": "Healthy red and white blood cell counts",
        "recommendations": ["Maintain current vitamin intake"]
      },
      "hepatic": {
        "score": 78,
        "assessment": "Slightly elevated liver enzymes",
        "recommendations": ["Reduce alcohol consumption", "Stay hydrated"]
      }
    }
  }
}
```

#### Dashboard Endpoints

**7. Get User Dashboard**
```
GET /api/v1/dashboard
Authorization: Bearer <accessToken>

Response (200 OK):
{
  "userId": "user_abc123",
  "reportsCount": 5,
  "lastReportDate": "2026-04-08T10:00:00Z",
  "overallHealthScore": 82,           // 0-100
  "organSystems": {
    "hematologic": {
      "score": 85,
      "trend": "stable",              // up|down|stable
      "trendPercent": 0
    },
    "hepatic": {
      "score": 78,
      "trend": "down",
      "trendPercent": -5
    },
    "renal": {
      "score": 88,
      "trend": "up",
      "trendPercent": 3
    }
  },
  "recentReports": [
    {
      "reportId": "report_def456",
      "reportDate": "2026-04-08",
      "status": "completed",
      "biomarkerCount": 45
    }
  ],
  "alerts": [
    {
      "level": "warning",             // info|warning|critical
      "message": "Liver enzyme trend declining",
      "actionUrl": "/reports/report_def456"
    }
  ]
}
```

#### Export Endpoints

**8. Export Report as PDF**
```
GET /api/v1/export/{reportId}/pdf
Authorization: Bearer <accessToken>

Response (200 OK):
Content-Type: application/pdf
Content-Disposition: attachment; filename="LongHealth_Report_2026-04-08.pdf"

<binary PDF content>

Response (404 Not Found):
{
  "error": "report_not_found",
  "message": "Report with ID report_def456 not found"
}
```

### Authentication Header Requirements

All endpoints except `/auth/*` require:
```
Authorization: Bearer <accessToken>
```

### Rate Limiting Strategy

| Endpoint | Limit | Window | Code |
|----------|-------|--------|------|
| `/auth/send-otp` | 5 requests | 1 hour | `rate_limit_exceeded` |
| `/reports/upload` | 20 requests | 1 hour | `rate_limit_exceeded` |
| `/dashboard` | 30 requests | 1 minute | `rate_limit_too_many` |
| `/export` | 10 requests | 1 hour | `rate_limit_export` |

**Implementation via Redis:**
```javascript
// Middleware using redis-rate-limit
const otpLimiter = rateLimit({
  store: new RedisStore({client: redis}),
  windowMs: 60 * 60 * 1000,           // 1 hour
  max: 5,
  keyGenerator: (req) => req.body.phone,
  handler: (req, res) => {
    res.status(429).json({error: 'rate_limit_exceeded'});
  }
});
```

### Error Response Format

All errors follow this structure:
```json
{
  "error": "error_code",              // machine-readable
  "message": "Human-readable message",
  "statusCode": 400,
  "timestamp": "2026-04-08T10:30:00Z",
  "requestId": "req_xyz789",          // for debugging
  "details": {                        // optional: validation errors
    "phone": "Invalid E.164 format",
    "otp": "OTP must be 6 digits"
  }
}
```

---

## Authentication Flow

### Phone OTP Authentication Sequence

```mermaid
sequenceDiagram
    participant User as User/App
    participant API as Auth Service
    participant Redis as Redis
    participant MSG91 as MSG91 SMS
    participant DB as PostgreSQL

    User->>API: POST /auth/send-otp<br/>{"phone": "+919876543210"}
    
    alt Rate Limit Check
        Redis->>API: Check OTP count (last 1hr)
        API->>User: 429 Too Many Requests
    else OK
        API->>MSG91: Send OTP "123456" to +919876543210
        MSG91->>User: SMS with OTP
        
        API->>Redis: SET otp:{phone} = {otp, timestamp, attempts=0}
        API->>Redis: EXPIRE 300 (5 minutes)
        API->>User: 200 OK {expiresIn: 300}
    end
    
    User->>API: POST /auth/verify-otp<br/>{"phone": "+919876543210", "otp": "123456"}
    
    alt Validation
        Redis->>API: GET otp:{phone}
        
        alt Expired or Invalid
            API->>User: 401 Unauthorized
        else Correct OTP
            API->>Redis: DEL otp:{phone}
            
            alt User Exists
                DB->>API: User found
            else New User
                API->>DB: INSERT new User
                DB->>API: userId
            end
            
            API->>API: Generate JWT<br/>(sub=userId, exp=7d)
            API->>API: Generate RefreshToken<br/>(exp=30d)
            API->>Redis: SET refresh:{refreshToken} = userId
            API->>Redis: EXPIRE 2592000 (30d)
            
            API->>User: 200 OK<br/>{accessToken, refreshToken, expiresIn}
        end
    end
    
    User->>API: GET /api/v1/dashboard<br/>Authorization: Bearer accessToken
    API->>API: Verify JWT signature
    API->>API: Check expiry (7 days)
    
    alt Expired
        API->>User: 401 Unauthorized {error: "token_expired"}
        User->>API: POST /auth/refresh-token<br/>Authorization: Bearer refreshToken
        Redis->>API: Verify refreshToken exists
        API->>User: 200 OK {accessToken, expiresIn}
    else Valid
        API->>DB: Query (userId from JWT)
        API->>User: 200 OK {dashboard data}
    end
```

### Token Details

**JWT Access Token (7 days):**
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_abc123",              // User ID
    "iat": 1712577600,                 // Issued at
    "exp": 1713182400,                 // Expires (7 days later)
    "type": "access",
    "scopes": ["read:reports", "write:reports"]
  }
}
// Signed with SECRET_KEY from .env
```

**Refresh Token (30 days):**
```
ref_<random_64_char_hex_string>
Stored in Redis with user_id mapping
```

### Rate Limiting Details

**OTP Send Limits:**
- Max 5 OTPs per phone number per hour
- Redis key: `otp_count:{phone}`
- Increment on send, expire after 1 hour

**OTP Verification Limits:**
- Max 3 incorrect attempts per OTP
- Redis key: `otp_attempts:{phone}`
- Lock account for 15 minutes after 3 failures

**Token Refresh Limits:**
- Max 10 refresh token uses per day per user
- Suspicious pattern: alert if >3 refreshes/minute
- Invalid refresh token: blacklist from Redis

---

## Report Processing Pipeline

### End-to-End Processing Flow

```mermaid
graph TD
    A["User uploads PDF<br/>POST /reports/upload"] --> B["Validate file<br/>PDF, <50MB, virus scan"]
    B -->|Valid| C["Upload to S3<br/>s3://long-health-pdfs/{userId}/{reportId}.pdf"]
    B -->|Invalid| D["400 Bad Request"]
    
    C --> E["Store metadata in DB<br/>status=uploading"]
    E --> F["Queue OCR Job<br/>BullMQ"]
    F --> G["Return 202 Accepted"]
    
    G -.-> H["OCR Job executes<br/>max 10 jobs parallel"]
    H --> I["Fetch PDF from S3"]
    I --> J{OCR Provider}
    J -->|Google Document AI| K["Google Doc AI API"]
    J -->|Cost-saving| L["Tesseract"]
    
    K --> M["Extract text, tables<br/>confidence scores"]
    L --> M
    
    M --> N["Store raw_text in DB<br/>status=extracted"]
    N --> O["Parse biomarkers<br/>regex + NLP"]
    O --> P["Extract biomarker values"]
    P --> Q["Queue Analysis Job"]
    
    Q -.-> R["Analysis Job executes<br/>max 5 jobs parallel"]
    R --> S["Build Claude prompt"]
    S --> T["Call Claude API<br/>gpt-4-vision"]
    T --> U["Get structured JSON<br/>organ_systems, recommendations"]
    
    U --> V["Validate response<br/>schema check"]
    V -->|Valid| W["Store analysis in DB<br/>status=completed"]
    V -->|Invalid| X["Retry 3x with backoff<br/>then status=failed"]
    
    W --> Y["Cache in Redis<br/>ttl=30days"]
    Y --> Z["Send push notification<br/>Report ready"]
    Z --> AA["User downloads<br/>or views dashboard"]
```

### Step-by-Step Processing

#### Step 1: Upload & Validation (Synchronous)
```javascript
// controllers/reportController.ts - uploadReport()
1. Receive multipart/form-data with PDF
2. Validate:
   - File type: must be PDF
   - File size: max 50MB
   - Virus scan: ClamAV or similar
3. Generate reportId = uuid()
4. Upload to S3:
   - Bucket: long-health-pdfs
   - Key: {userId}/{reportId}/original.pdf
   - ServerSideEncryption: AES256
   - Metadata: {"userId": userId, "uploadTime": now}
5. Create Report record in DB:
   {
     reportId,
     userId,
     uploadedAt: now,
     status: "uploading",
     fileSize,
     s3Key,
     pageCount: 0,
     extractedBiomarkerCount: 0
   }
6. Return 202 Accepted with statusUrl
```

#### Step 2: OCR Extraction (Async Job)
```javascript
// jobs/ocrJob.ts
1. Fetch PDF from S3
2. Call OCR provider:
   - Google Document AI: High accuracy (~95%), ~$1.50/page
   - Tesseract: Lower accuracy (~80%), free
3. Strategy:
   - Try Google first (confidence threshold 0.85)
   - Fall back to Tesseract if:
     a) Cost threshold exceeded (>$1/report)
     b) Service unavailable
     c) Low confidence on Google
4. Extract:
   - Full text
   - Structured tables (biomarker values)
   - Line-item confidence scores
5. Store ReportPage records:
   {
     reportId,
     pageNumber,
     rawText,
     tables: [{headers, rows}],
     confidence: 0.92,
     ocrProvider: "google|tesseract",
     extractedAt: now
   }
6. Update Report.status = "extracted"
7. Parse biomarker values from extracted text
```

#### Step 3: Biomarker Parsing
```javascript
// utils/biomarkerParser.ts
1. Load biomarkerRanges.json (150+ biomarkers)
2. For each extracted line:
   a. Match against regex patterns:
      - /hemoglobin\s*[:=]\s*(\d+\.?\d*)\s*(g\/dL|g%)/i
      - /wbc\s*[:=]\s*(\d+,?\d*)/i
   b. Extract value, unit
   c. Normalize unit (convert mg to grams, etc.)
3. Cross-reference with reference ranges by:
   - User gender (from profile if available)
   - Age (estimate if unknown)
   - Lab normal ranges (extract if printed)
4. Flag abnormal values:
   - Low: value < reference_min
   - High: value > reference_max
   - Normal: within range
5. Store Biomarker records:
   {
     reportId,
     code: "RBC",
     value: 5.2,
     unit: "million/mcL",
     referenceMin: 4.5,
     referenceMax: 6.0,
     status: "normal",
     confidence: 0.98
   }
```

#### Step 4: AI Analysis (Async Job)
```javascript
// jobs/analysisJob.ts
1. Fetch all biomarkers for report
2. Check cache:
   - Redis key: biomarker_hash:{hash}
   - If exists: use cached analysis (same biomarker set)
3. Build Claude prompt (see AI Analysis Pipeline)
4. Call Claude API with timeout 30s
5. Parse response:
   - Extract organ_systems
   - Extract recommendations
   - Extract warnings
6. Validate schema:
   - Each organ_system has: name, score (0-100), assessment, recommendations
   - Recommendations are actionable
7. Store Analysis record:
   {
     reportId,
     claudeVersion: "claude-3-sonnet",
     prompt_tokens: 2500,
     completion_tokens: 1200,
     totalCost: 0.035,
     organSystems: [...],
     summary: "...",
     generatedAt: now
   }
8. Cache in Redis for 30 days
9. Update Report.status = "completed"
10. Publish "report.completed" event
```

#### Step 5: Error Handling at Each Step

| Step | Error | Recovery |
|------|-------|----------|
| Upload | Network timeout | Queue for retry (3x) |
| Upload | S3 capacity exceeded | Return 503, suggest retry later |
| OCR | Google API rate limit | Fall back to Tesseract |
| OCR | Tesseract timeout (>60s) | Mark page failed, continue others |
| Biomarker Parse | No biomarkers found | Mark as "unprocessable_format" |
| AI Analysis | Claude API timeout | Retry with backoff (3x) |
| AI Analysis | Invalid JSON response | Manual review queue |
| Analysis | Network error | Exponential backoff, max 1 hour |

#### Step 6: Notification Flow
```javascript
// After report.status = completed:
1. Store Notification record
2. If user has push token (mobile):
   - Send FCM/APNS notification
   - "Your blood report analysis is ready"
3. Store in-app notification
4. Email notification (Phase 2)
```

### BullMQ Queue Configuration

```javascript
// config/queueConfig.ts
const ocrQueue = new Queue('ocr', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000                     // 2s, 4s, 8s
    },
    removeOnComplete: true,
    timeout: 60000                    // 60s max
  }
});

const analysisQueue = new Queue('analysis', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000                     // 5s, 10s, 20s
    },
    removeOnComplete: true,
    timeout: 30000                    // 30s max
  }
});

// Concurrency
ocrQueue.process(10, ocrJobHandler);           // 10 parallel OCR jobs
analysisQueue.process(5, analysisJobHandler);  // 5 parallel analysis jobs
```

---

## AI Analysis Pipeline

### Claude API Integration

#### Prompt Structure & Strategy

```javascript
// utils/promptBuilder.ts

function buildAnalysisPrompt(biomarkers, userProfile) {
  const systemPrompt = `You are an expert clinical laboratory analyzer specializing in blood test interpretation. 
Your role is to:
1. Analyze blood biomarker values in context of reference ranges and patient demographics
2. Identify patterns and potential health concerns
3. Provide actionable, evidence-based health recommendations
4. Communicate clearly while avoiding medical diagnosis (add disclaimer)

CRITICAL: You are an analysis tool, NOT a doctor. Frame all insights as "may indicate" not "is".`;

  const biomarkerContext = formatBiomarkers(biomarkers);
  
  const userContext = `
Patient Demographics:
- Age: ${userProfile.age}
- Gender: ${userProfile.gender}
- Existing Conditions: ${userProfile.conditions || 'None reported'}
- Current Medications: ${userProfile.medications || 'None reported'}
`;

  const jsonSchema = `
You MUST respond with ONLY valid JSON (no markdown, no extra text):
{
  "overall_assessment": "Brief summary",
  "organ_systems": [
    {
      "system": "hematologic|hepatic|renal|metabolic|cardiovascular",
      "score": 85,
      "status": "normal|warning|critical",
      "assessment": "Key findings",
      "recommendations": ["Action 1", "Action 2"],
      "biomarkers_evaluated": ["RBC", "WBC"]
    }
  ],
  "abnormalities_found": [
    {
      "biomarker": "ALT",
      "value": 45,
      "reference_range": "7-35",
      "severity": "minor",
      "potential_causes": ["Liver inflammation", "Muscle damage"],
      "suggested_actions": ["Reduce alcohol", "Consult hepatologist"]
    }
  ],
  "lifestyle_recommendations": ["Hydration", "Exercise"],
  "when_to_see_doctor": "If ALT remains elevated in 2 weeks",
  "disclaimer": "This analysis is for informational purposes only. Always consult a healthcare provider."
}`;

  return `${systemPrompt}\n\n${biomarkerContext}\n\n${userContext}\n\n${jsonSchema}`;
}

function formatBiomarkers(biomarkers) {
  return biomarkers.map(b => 
    `${b.code}: ${b.value} ${b.unit} (ref: ${b.referenceMin}-${b.referenceMax}) [${b.status}]`
  ).join('\n');
}
```

#### Functional & Optimal Range Database

```json
{
  "biomarkers": {
    "RBC": {
      "name": "Red Blood Cell Count",
      "unit": "million/mcL",
      "ranges": {
        "adult_male": {
          "min": 4.5,
          "max": 6.0,
          "optimal": 5.2
        },
        "adult_female": {
          "min": 4.0,
          "max": 5.5,
          "optimal": 4.7
        }
      },
      "organ_system": "hematologic",
      "interpretation": {
        "high": "Polycythemia, dehydration, altitude adaptation",
        "low": "Anemia, bleeding, bone marrow disorder"
      }
    },
    "ALT": {
      "name": "Alanine Aminotransferase",
      "unit": "U/L",
      "ranges": {
        "adult": {
          "functional_min": 0,
          "functional_max": 35,
          "optimal_min": 10,
          "optimal_max": 25
        }
      },
      "organ_system": "hepatic",
      "interpretation": {
        "high": "Liver inflammation, hepatitis, cirrhosis, medication side-effect",
        "low": "Vitamin B6 deficiency"
      }
    }
  }
}
```

#### API Call Implementation

```javascript
// utils/claudeClient.ts

async function analyzeBloodReport(reportId, biomarkers, userProfile) {
  const prompt = buildAnalysisPrompt(biomarkers, userProfile);
  
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      system: "You are a clinical laboratory analyzer...",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });
    
    // Parse response
    const analysisText = response.content[0].text;
    const analysis = JSON.parse(analysisText);
    
    // Validate against schema
    validateAnalysisSchema(analysis);
    
    // Store token usage for cost tracking
    const costPerAnalysis = 
      (response.usage.input_tokens * 0.003 + 
       response.usage.output_tokens * 0.015) / 1000;  // Cost in USD
    
    return {
      analysis,
      metadata: {
        modelUsed: "claude-3-5-sonnet-20241022",
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cost: costPerAnalysis
      }
    };
  } catch (error) {
    if (error.status === 429) {
      throw new Error('CLAUDE_RATE_LIMITED');
    }
    if (error.message.includes('timeout')) {
      throw new Error('CLAUDE_TIMEOUT');
    }
    throw error;
  }
}
```

#### Structured Output Format

```json
{
  "overall_assessment": "Your blood work shows mostly healthy values with one area needing attention.",
  "organ_systems": [
    {
      "system": "hematologic",
      "score": 88,
      "status": "normal",
      "assessment": "Red and white blood cell counts are healthy. Hemoglobin and hematocrit indicate good oxygen-carrying capacity.",
      "recommendations": [
        "Continue current iron intake from diet",
        "Maintain regular physical activity",
        "Stay well-hydrated (8-10 glasses/day)"
      ],
      "biomarkers_evaluated": ["RBC", "WBC", "Hemoglobin", "Hematocrit"]
    },
    {
      "system": "hepatic",
      "score": 72,
      "status": "warning",
      "assessment": "ALT and AST enzymes are slightly elevated (ALT: 45 U/L, ref: <35). May indicate mild liver inflammation or recent muscle activity.",
      "recommendations": [
        "Reduce alcohol consumption to <2 drinks/week",
        "Avoid fatty and fried foods for 2 weeks",
        "Repeat liver function tests in 4 weeks",
        "Consult hepatologist if levels remain elevated"
      ],
      "biomarkers_evaluated": ["ALT", "AST", "Bilirubin"]
    }
  ],
  "abnormalities_found": [
    {
      "biomarker": "ALT",
      "value": 45,
      "unit": "U/L",
      "reference_range": "7-35",
      "severity": "minor",
      "potential_causes": [
        "Fatty liver disease",
        "Viral hepatitis",
        "Alcohol-related liver disease",
        "Recent intense exercise"
      ],
      "suggested_actions": [
        "Dietary modification (reduce fats)",
        "Limit alcohol",
        "Repeat test in 4 weeks"
      ]
    }
  ],
  "lifestyle_recommendations": [
    "Increase fiber intake (whole grains, vegetables) to support liver health",
    "Exercise 150 min/week (walking, yoga) to support metabolism",
    "Reduce processed food and added sugars",
    "Sleep 7-8 hours nightly for metabolic health"
  ],
  "when_to_see_doctor": "If ALT/AST remain elevated in repeat tests or if you develop abdominal pain or fatigue.",
  "disclaimer": "This analysis is for informational purposes only and should not replace professional medical advice. Always consult a licensed healthcare provider for diagnosis and treatment."
}
```

#### Cost Estimation per Analysis

```
Model: Claude 3.5 Sonnet
Pricing: $3/MTok input, $15/MTok output

Average per analysis:
- Input tokens: 2,500 (biomarkers + context + prompt)
- Output tokens: 1,200 (full analysis)

Cost calculation:
= (2,500 * $3 + 1,200 * $15) / 1,000,000
= ($7.50 + $18) / 1,000,000
= $0.0000255 per report
= ~$0.026 per report (rounded to $0.03)

At 100 users/day:
= 100 * $0.03 * 30 = $90/month Claude API costs
```

#### Caching Strategy for Similar Reports

```javascript
// utils/cacheManager.ts

async function getOrAnalyzeReport(reportId, biomarkers) {
  // Create hash of biomarker set (ignoring slight value differences)
  const biomarkerHash = hashBiomarkerSet(biomarkers);
  
  const cacheKey = `analysis:${biomarkerHash}`;
  
  // Check Redis cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return {
      analysis: JSON.parse(cached),
      source: 'cache'
    };
  }
  
  // Call Claude API
  const result = await analyzeBloodReport(reportId, biomarkers);
  
  // Cache for 30 days
  await redis.setex(
    cacheKey,
    30 * 24 * 60 * 60,  // 30 days in seconds
    JSON.stringify(result.analysis)
  );
  
  return {
    analysis: result.analysis,
    source: 'claude',
    metadata: result.metadata
  };
}

function hashBiomarkerSet(biomarkers) {
  // Create deterministic hash ignoring minor value differences
  const normalized = biomarkers
    .map(b => `${b.code}:${Math.round(b.value/5)*5}`)  // Round to nearest 5
    .sort()
    .join('|');
  
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
```

---

## Security Architecture

### Encryption Standards

**At Rest:**
```
- Database passwords: AES-256 in environment variables
- PDF files in S3: Server-side encryption (SSE-S3 default)
- Sensitive data in DB: Column-level encryption using AWS KMS
- Configuration: Encrypted .env files (never committed)
```

**In Transit:**
```
- All HTTPS/TLS 1.3 minimum
- Certificate: AWS Certificate Manager (auto-renewed)
- HSTS: enabled (Strict-Transport-Security header)
- Perfect Forward Secrecy: enabled (ephemeral Diffie-Hellman)
```

**Implementation:**
```javascript
// middleware/securityHeaders.ts
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});

// S3 encryption
const s3 = new AWS.S3({
  serverSideEncryption: 'AES256',
  sseCustomerAlgorithm: 'AES256'
});
```

### DPDPA 2023 Compliance Checklist

**Data Protection & Privacy Act (India):**

- [x] **User Consent**: Explicit opt-in before data collection
  - Checkbox on signup: "I agree to health data processing"
  - Transparent privacy policy available

- [x] **Data Localization**: Medical data stored in India (Mumbai)
  - RDS: ap-south-1 (AWS Mumbai)
  - S3: ap-south-1
  - No cross-border transfer without consent

- [x] **Data Minimization**: Collect only necessary fields
  - Phone number (authentication)
  - Gender/Age (for biomarker normalization, optional)
  - Health reports (user-provided)

- [x] **Right to Access**: Users can download all their data
  - GET /api/v1/user/data/export → ZIP of all reports & analyses

- [x] **Right to Deletion**: Users can delete accounts
  - DELETE /api/v1/user/account → soft-delete, retain 30d for recovery
  - No permanent deletion due to audit trail requirements

- [x] **Data Security**: Encryption + access controls
  - AES-256 at rest, TLS 1.3 in transit
  - Role-based access (only admins can access user data)
  - Audit logs of all data access

- [x] **Third-party Processors**: Data Processing Agreements
  - AWS: DPA signed
  - Claude API: Data privacy addendum signed
  - MSG91/Twilio: DPA signed

- [x] **Data Breach Notification**: Report within 72 hours
  - Monitor Sentry for unauthorized access attempts
  - Procedure: Alert > Investigate > Notify > Document

- [x] **Medical Disclaimer**: Clear on every analysis
  - "This is not medical diagnosis"
  - "Consult healthcare provider"
  - "For informational purposes only"

### Input Validation & Sanitization

```javascript
// middleware/validation.ts

// Phone number validation (E.164 format)
const phoneSchema = Joi.string()
  .pattern(/^\+91[6-9]\d{9}$/)  // India phone numbers
  .required();

// OTP validation (6 digits)
const otpSchema = Joi.string()
  .pattern(/^\d{6}$/)
  .required();

// File upload validation
const fileSchema = Joi.object().keys({
  filename: Joi.string().pattern(/\.pdf$/i).required(),
  mimetype: Joi.string().equal('application/pdf').required(),
  size: Joi.number().max(50 * 1024 * 1024).required()
});

// Request body sanitization
const xss = require('xss');
app.use(express.json({
  verify: (req, res, buf) => {
    // Sanitize JSON input
    req.body = JSON.parse(xss(buf.toString('utf8')));
  }
}));

// SQL injection prevention: use parameterized queries
db.query(
  'SELECT * FROM users WHERE phone = $1',
  [userPhone]  // Parameter, not string concatenation
);
```

### Rate Limiting & DDoS Protection

```javascript
// middleware/rateLimiter.ts

// Global rate limiter: 100 requests/min per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.ip,
  store: new RedisStore({client: redis})
});

// Auth endpoint limiter: 5 OTP/hour per phone
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.body.phone,
  store: new RedisStore({client: redis})
});

// Upload limiter: 20 uploads/hour per user
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user.id,
  store: new RedisStore({client: redis})
});

app.use(globalLimiter);
app.use('/auth/send-otp', authLimiter);
app.post('/reports/upload', uploadLimiter, uploadHandler);
```

### OWASP Top 10 Controls

| Vulnerability | Control | Implementation |
|---|---|---|
| A01: Broken Access Control | JWT + role-based access | Verify user_id matches request |
| A02: Cryptographic Failures | AES-256, TLS 1.3 | Encrypt sensitive fields |
| A03: Injection | Parameterized queries, input validation | Use ORM (TypeORM) |
| A04: Insecure Design | Security-first architecture | Threat modeling in design |
| A05: Security Misconfiguration | Remove defaults, lock down APIs | Security headers, CORS policy |
| A06: Vulnerable Components | Dependency scanning | Dependabot + npm audit |
| A07: Authentication Failures | Rate limiting + OTP validation | See auth section above |
| A08: Data Integrity Failures | ACID transactions, signing | PostgreSQL ACID + JWT verification |
| A09: Logging & Monitoring | Sentry + CloudWatch | Centralized error tracking |
| A10: SSRF | URL validation | Whitelist internal URLs |

### Medical Disclaimer Implementation

```javascript
// middleware/medicalDisclaimer.ts
// Inject disclaimer on every analysis response

const disclaimerText = `
IMPORTANT MEDICAL DISCLAIMER:
This analysis is provided for educational and informational purposes only.
It is NOT a medical diagnosis, prescription, or treatment recommendation.
Always consult a licensed healthcare provider before making health decisions.
Long Health is not liable for consequences of self-treatment without professional guidance.
`;

app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    if (data.analysis) {
      data.analysis.disclaimer = disclaimerText;
      data.analysis.medicalConsultationRequired = true;
    }
    originalJson.call(this, data);
  };
  next();
});
```

---

## Infrastructure & Deployment

### AWS Mumbai (ap-south-1) Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  AWS Region: ap-south-1 (Mumbai)                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Availability Zones (2: ap-south-1a, ap-south-1b)    │  │
│  │                                                      │  │
│  │  ┌─────────────────────────────────────────────┐   │  │
│  │  │ ECS Fargate Cluster (Auto Scaling Group)    │   │  │
│  │  │ • API Container (2+ replicas)               │   │  │
│  │  │ • Task CPU: 0.5 vCPU                        │   │  │
│  │  │ • Task Memory: 1024 MB                      │   │  │
│  │  │ • Launch Type: FARGATE_SPOT (cost savings)  │   │  │
│  │  └─────────────────────────────────────────────┘   │  │
│  │                                                      │  │
│  │  ┌─────────────────────────────────────────────┐   │  │
│  │  │ RDS Aurora PostgreSQL (Multi-AZ)            │   │  │
│  │  │ • Engine: PostgreSQL 15.2                   │   │  │
│  │  │ • Instance: db.t3.small (burstable)         │   │  │
│  │  │ • Replicas: 1 standby in separate AZ        │   │  │
│  │  │ • Automated backups: 7 days retention       │   │  │
│  │  │ • Encryption: AWS KMS                       │   │  │
│  │  └─────────────────────────────────────────────┘   │  │
│  │                                                      │  │
│  │  ┌─────────────────────────────────────────────┐   │  │
│  │  │ ElastiCache Redis (Cache Node)              │   │  │
│  │  │ • Node Type: cache.t3.micro                 │   │  │
│  │  │ • Replication: 1 primary (no replica yet)   │   │  │
│  │  │ • Persistence: RDB + AOF                    │   │  │
│  │  │ • Encryption: TLS in transit                │   │  │
│  │  └─────────────────────────────────────────────┘   │  │
│  │                                                      │  │
│  │  ┌─────────────────────────────────────────────┐   │  │
│  │  │ S3 Buckets                                  │   │  │
│  │  │ • long-health-pdfs: PDFs (Encrypted)        │   │  │
│  │  │ • long-health-exports: Generated PDFs       │   │  │
│  │  │ • Versioning: Enabled                       │   │  │
│  │  │ • Lifecycle: 90-day delete old PDFs         │   │  │
│  │  │ • Replication: None (single region)         │   │  │
│  │  └─────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  CloudFront (Global CDN)                                   │
│  Origin: S3 + API Gateway                                 │
│  Cache Behaviors:                                          │
│  • /api/* → Origin (Cache: None)                          │
│  • /static/* → S3 (Cache: 30 days)                        │
│  • /images/* → S3 (Cache: 1 year)                         │
└─────────────────────────────────────────────────────────────┘
```

### RDS PostgreSQL Configuration

```
Instance Type: db.t3.small (2 vCPU, 2GB RAM)
Storage: 100GB gp3
Engine: PostgreSQL 15.2
Multi-AZ: Enabled (automatic failover)
Backup Retention: 7 days
Performance Insights: Enabled
Enhanced Monitoring: Enabled

Security:
- VPC Security Group: Allow only ECS + bastion
- Encryption: AWS KMS
- Authentication: IAM database authentication
- SSL/TLS: Required

Parameter Groups:
- max_connections: 200
- shared_buffers: 524MB (25% of 2GB)
- effective_cache_size: 1GB
- work_mem: 5MB
```

### ElastiCache Redis Configuration

```
Cluster Mode: Disabled (single node, cheaper)
Node Type: cache.t3.micro (0.5GB)
Engine: Redis 7.0
Replication: None (MVP phase, add later)
Encryption:
  - At-rest: enabled (KMS)
  - In-transit: TLS enabled
  
Backup: Automatic snapshots daily
Retention: 5 days

Usage:
- Session tokens: TTL-based expiry
- OTP verification: 5-min TTL
- Biomarker cache: 30-day TTL
- Rate limit counters: 1-hour TTL
- Real-time counters: No persistence needed
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to ECS

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main, staging]

env:
  AWS_REGION: ap-south-1
  ECR_REPOSITORY: long-health-api
  ECS_SERVICE: long-health-api-service
  ECS_CLUSTER: long-health-cluster

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      
      - run: npm run lint
      
      - run: npm run test
      
      - run: npm run test:integration
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_TEST }}
          REDIS_URL: ${{ secrets.REDIS_URL_TEST }}

  build:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.image.outputs.image }}
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build & Push Docker Image
        id: image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }} \
            --service ${{ env.ECS_SERVICE }} \
            --force-new-deployment \
            --region ${{ env.AWS_REGION }}
      
      - name: Wait for Deployment
        run: |
          aws ecs wait services-stable \
            --cluster ${{ env.ECS_CLUSTER }} \
            --services ${{ env.ECS_SERVICE }} \
            --region ${{ env.AWS_REGION }}
      
      - name: Notify Sentry
        run: |
          curl https://sentry.io/api/0/organizations/${{ secrets.SENTRY_ORG }}/releases/ \
            -X POST \
            -H 'Authorization: Bearer ${{ secrets.SENTRY_TOKEN }}' \
            -H 'Content-Type: application/json' \
            -d '{"version":"${{ github.sha }}"}'
```

### Environment Strategy

```
Development (dev):
- Database: PostgreSQL dev instance (t3.micro)
- Redis: Local or micro instance
- S3: dev bucket
- API: http://localhost:3000
- Logs: CloudWatch (dev group)
- Monitoring: Sentry (optional)

Staging (staging):
- Database: PostgreSQL staging instance (t3.small, separate from prod)
- Redis: cache.t3.micro
- S3: staging bucket
- API: https://api-staging.longhealth.app
- Logs: CloudWatch (staging group)
- Monitoring: Sentry (full)
- Testing: Smoke tests post-deploy

Production (prod):
- Database: PostgreSQL prod instance (Multi-AZ)
- Redis: cache.t3.small or larger
- S3: prod bucket (encrypted, versioned)
- API: https://api.longhealth.app
- Logs: CloudWatch (prod group)
- Monitoring: Sentry + PostHog
- Alerts: PagerDuty integration
```

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node healthcheck.js

EXPOSE 3000

CMD ["node", "src/index.js"]
```

---

## Cost Estimation

### Monthly Infrastructure Costs (AWS ap-south-1)

#### At 0 Users (Baseline)
```
ECS Fargate:
  - 1x 0.5 vCPU, 1GB: $3.70/month (Fargate is cheaper than EC2 for small loads)

RDS Aurora PostgreSQL:
  - db.t3.small: $45/month
  - Storage (100GB gp3): $10/month
  - Data transfer: negligible

ElastiCache Redis:
  - cache.t3.micro: $10/month

S3:
  - Storage (100GB): $2.30/month
  - Requests: <$1

CloudFront:
  - Minimal traffic: <$1

Monitoring:
  - Sentry: Free tier
  - PostHog: Free tier
  - CloudWatch: $0-5/month

NAT Gateway: $0 (not needed for MVP)

TOTAL: ~$71/month
```

#### At 1,000 Users (100 reports/day)
```
ECS Fargate:
  - 2x 0.5 vCPU, 1GB: $7.40/month
  - Compute time: ~100 hrs/month = $3.60/month

RDS Aurora PostgreSQL:
  - db.t3.small (no upgrade needed): $45/month
  - Storage (500GB gp3): $50/month
  - Backup: negligible

ElastiCache Redis:
  - cache.t3.micro (sufficient): $10/month
  - Replication: not needed yet

S3:
  - Storage (500GB): $11.50/month
  - Requests (100/day = 3,000/month): ~$1

CloudFront:
  - Data out (50GB/month): ~$5

Claude API (100 reports × $0.03):
  - Monthly: $3

SMS (MSG91):
  - 1,000 OTP sends × ₹0.30 = ₹300 (~$3.60)

TOTAL: ~$140/month
```

#### At 5,000 Users (500 reports/day)
```
ECS Fargate:
  - 3x 1 vCPU, 2GB FARGATE_SPOT: $22/month
  - Compute time: ~600 hrs/month = $21.60/month

RDS Aurora PostgreSQL:
  - db.t3.medium (upgrade for concurrent connections): $100/month
  - Storage (2TB gp3): $205/month
  - Read replica: $100/month

ElastiCache Redis:
  - cache.t3.small: $22/month
  - Replication: +$22/month

S3:
  - Storage (2TB): $46/month
  - Requests: ~$5

CloudFront:
  - Data out (250GB/month): ~$20

Claude API (500 reports × $0.03):
  - Monthly: $15

SMS (5,000 × ₹0.30):
  - Monthly: ₹1,500 (~$18)

Sentry (if upgraded): $30/month

TOTAL: ~$475/month
```

#### At 10,000 Users (1,000 reports/day)
```
ECS Fargate:
  - 5x 1 vCPU, 2GB FARGATE_SPOT: $40/month
  - Compute time: ~1,200 hrs/month = $43/month

RDS Aurora PostgreSQL:
  - db.r5.large (better for reads): $300/month
  - Storage (5TB gp3): $512/month
  - 2 read replicas: $600/month

ElastiCache Redis:
  - cache.r5.large: $100/month
  - 2 replicas for HA: $200/month

S3:
  - Storage (5TB): $115/month
  - Requests: ~$10

CloudFront:
  - Data out (500GB/month): ~$40

Claude API (1,000 reports × $0.03):
  - Monthly: $30

SMS (10,000 × ₹0.30):
  - Monthly: ₹3,000 (~$36)

Sentry (upgraded): $50/month
PostHog (upgrade): $100/month

AWS Support: $100/month

TOTAL: ~$1,500/month
```

### Claude API Cost Breakdown

```
Model: Claude 3.5 Sonnet
Pricing: $3/MTok input, $15/MTok output

Per-analysis estimate:
- Input tokens: 2,500 (biomarker data + prompt)
- Output tokens: 1,200 (full analysis)

Cost per analysis:
= (2,500 × $3 + 1,200 × $15) / 1,000,000
= ($7.50 + $18.00) / 1,000,000
= $0.0000255
= ~$0.025-0.035 per report

Monthly volume scenarios:
- 100 reports/month: $2.50-3.50
- 500 reports/month: $12.50-17.50
- 1,000 reports/month: $25-35
- 5,000 reports/month: $125-175
- 10,000 reports/month: $250-350
```

### Burn Rate Summary

| Users | Monthly Cost | Cost/User | Annual |
|-------|------------|-----------|--------|
| 0 | $71 | N/A | $852 |
| 1K | $140 | $0.14 | $1,680 |
| 5K | $475 | $0.095 | $5,700 |
| 10K | $1,500 | $0.15 | $18,000 |
| 50K | ~$5,500 | $0.11 | $66,000 |

**Business Model Assumption:**
- Phase 1 (Free): 0-10K users, ~$1.5K/month burn
- Phase 2 (Chat): 10-50K users, premium features monetized
- Target: Break-even at 50K users with $2/month ARPU

---

## Scalability Plan

### Handling 10x Growth (0 → 100K Users)

#### Database Scaling

**Current (db.t3.small):**
- Max connections: 100
- Suitable for: ~1K concurrent users

**At 10K users:**
- Upgrade to db.t3.medium
- Max connections: 200
- Add read replica in separate AZ

**At 50K users:**
- Upgrade to db.r5.large (memory-optimized)
- Add 2 read replicas
- Implement read/write splitting
- Biomarker queries → read replica
- User updates → primary

**At 100K users:**
- Consider Aurora PostgreSQL cluster
- Enable connection pooling (PgBouncer)
- Partition large tables (by userId)

#### Application Scaling

**Horizontal Scaling:**
```
ECS Fargate Auto-scaling policy:
- Target CPU: 70%
- Target Memory: 80%
- Scale out if CPU > 70% for 2 minutes
- Min tasks: 2 (HA)
- Max tasks: 10 (cost control)

At different user levels:
- 1K users: 2 tasks (0.5 vCPU each)
- 10K users: 3-4 tasks (1 vCPU each)
- 50K users: 6-8 tasks (1-2 vCPU each)
- 100K users: 10+ tasks (2 vCPU each)
```

**Queue Processing Optimization:**
```
BullMQ concurrency tuning:
- OCR jobs: 10 parallel → 20-30 at scale
- Analysis jobs: 5 parallel → 15-20 at scale
- Priority queues: Critical analyses first

Redis memory optimization:
- Current: cache.t3.micro (512MB)
- At 50K users: cache.r5.large (6.5GB)
- Eviction policy: LRU (least recently used)
```

### Caching Strategy (Redis for Hot Data)

```
Cache tiers:
├─ L1: Web browser cache (1 hour)
├─ L2: CloudFront CDN (24 hours)
└─ L3: Redis cache (30 days)

Data cached:
1. User sessions: TTL 7 days (access token) + 30 days (refresh)
2. Biomarker reference ranges: TTL 90 days (static)
3. Analysis results: TTL 30 days (computed once)
4. Dashboard aggregates: TTL 6 hours (refresh nightly)
5. User profiles: TTL 24 hours

Cache invalidation:
- On report upload: invalidate user's dashboard cache
- On analysis complete: invalidate report cache
- Manual invalidation: /admin/cache/clear/:userId
```

**Cache Hit Optimization:**
```javascript
// Predictable key structure for high hit rates
const cacheKeys = {
  userDashboard: `dashboard:{userId}`,
  userReports: `reports:{userId}`,
  biomarkerRanges: `ref:biomarkers:all`,
  analysisResult: `analysis:{reportId}`,
  sessionToken: `session:{token}`,
  otpVerification: `otp:{phone}`
};

// Monitor cache hit rate
// Target: >80% hit rate on dashboard queries
// Actual: Check CloudWatch metrics
```

### CDN Strategy (CloudFront for Static Assets)

```
CloudFront Distribution:
- Origins:
  a) S3 (static assets, PDFs)
  b) API Gateway (dynamic content)

Cache behaviors:
1. /api/* → API Gateway
   - Cache policy: Disabled (always hit origin)
   - No compression (small payloads)

2. /static/*  → S3
   - Cache policy: 30 days
   - Compress: gzip
   - Query strings: not forwarded

3. /exports/* → S3
   - Cache policy: 30 days
   - Signed URLs (user-specific)

4. / (index.html) → S3
   - Cache policy: 5 minutes (app updates quickly)

At 100K users:
- Data out: ~500GB/month
- CloudFront: $20/month
- Direct S3: would be $5,000/month
- Savings: ~$5,000/month
```

### Database Query Optimization

```javascript
// Indexes for fast queries
CREATE INDEX idx_reports_userid_date ON reports(user_id, created_at DESC);
CREATE INDEX idx_biomarkers_reportid ON biomarkers(report_id);
CREATE INDEX idx_analysis_reportid ON analyses(report_id);
CREATE INDEX idx_users_phone ON users(phone);  // For auth lookups

// Query optimization examples:
// Slow: SELECT * FROM reports WHERE user_id = 123
// Fast: SELECT id, status, created_at FROM reports WHERE user_id = 123

// Denormalization for dashboard:
CREATE TABLE user_health_summary AS (
  SELECT
    user_id,
    COUNT(*) as report_count,
    AVG(overall_score) as avg_health_score,
    MAX(created_at) as latest_report_date
  FROM reports
  GROUP BY user_id
);
// Refresh: daily batch job, not on every request
```

### Monitoring Scalability

```javascript
// CloudWatch metrics to monitor:
1. ECS CPU Utilization (target: 60-70%)
2. RDS CPU Utilization (target: <40%)
3. RDS Read/Write Latency (target: <10ms)
4. Redis Evictions (target: 0 per minute)
5. API Response Time p95 (target: <500ms)
6. Job Queue Depth (target: <100 pending)

// Alerts:
- CPU > 80% for 5 min → Auto-scale
- Response time p95 > 1s → Page on-call
- Job queue depth > 500 → Escalate
- Cache hit rate < 70% → Investigate
```

---

## Monitoring & Observability

### Sentry Integration (Error Tracking)

```javascript
// utils/sentry.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,  // 100% in MVP (reduce to 10% at scale)
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection()
  ]
});

// Middleware to attach request context
app.use((req, res, next) => {
  Sentry.captureException = Sentry.withScope((scope) => {
    scope.setUser({ id: req.user?.id, phone: req.user?.phone });
    scope.setTag('environment', process.env.NODE_ENV);
    scope.setContext('request', {
      method: req.method,
      url: req.url,
      headers: req.headers
    });
  });
  next();
});

// Explicit error logging
try {
  await analyzeReport(reportId);
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      service: 'analysis',
      reportId: reportId
    },
    extra: {
      biomarkerCount: biomarkers.length
    }
  });
  throw error;
}
```

### PostHog Analytics (Product Metrics)

```javascript
// utils/posthog.ts
import PostHog from 'posthog-node';

const posthog = new PostHog(process.env.POSTHOG_API_KEY);

// Track signup
app.post('/auth/send-otp', (req, res) => {
  const userId = user.id;
  posthog.capture({
    distinctId: userId,
    event: 'otp_requested',
    properties: {
      phone_last_digit: phone.slice(-1),
      is_returning_user: false
    }
  });
});

// Track report upload
app.post('/reports/upload', (req, res) => {
  posthog.capture({
    distinctId: req.user.id,
    event: 'report_uploaded',
    properties: {
      file_size_mb: file.size / (1024*1024),
      lab_name: req.body.labName
    }
  });
});

// Track analysis completion
postAnalysisJob.on('complete', (result) => {
  posthog.capture({
    distinctId: report.userId,
    event: 'analysis_completed',
    properties: {
      processing_time_seconds: result.duration,
      biomarker_count: result.biomarkers.length,
      abnormalities_found: result.abnormalities.length,
      cost_usd: result.cost
    }
  });
});

// Funnel tracking: signup → upload → analysis
// Event sequence: otp_requested → otp_verified → report_uploaded → analysis_completed
```

### CloudWatch Logging

```javascript
// middleware/logging.ts
import winston from 'winston';
import WinstonCloudWatch from 'winston-cloudwatch';

const logger = winston.createLogger({
  transports: [
    new WinstonCloudWatch({
      logGroupName: `/aws/ecs/long-health-${process.env.NODE_ENV}`,
      logStreamName: `api/${process.env.ECS_TASK_ID}`,
      awsRegion: 'ap-south-1',
      messageFormatter: ({level, message, meta}) => 
        `[${level}] ${message} ${JSON.stringify(meta)}`
    })
  ]
});

// Log at key points
logger.info('Report processing started', {reportId, fileSize});
logger.error('OCR extraction failed', {reportId, error: err.message});
logger.warn('Claude API slow response', {reportId, duration: 5000});
```

---

## Team & Development Workflow

### Team Composition (2-3 Engineers)

**Role Distribution:**
```
Engineer 1 (Full-stack):
- Backend API development (Node.js/Express)
- PostgreSQL schema design
- Infrastructure setup (AWS)

Engineer 2 (Mobile/Web):
- React Native (Expo) mobile app
- Next.js PWA web app
- UI/UX implementation

Engineer 3 (Optional - DevOps/QA):
- CI/CD pipeline (GitHub Actions)
- Infrastructure monitoring
- QA testing & automation
```

### AI-Assisted Development Workflow

**Development Tools:**
- IDE: VS Code + GitHub Copilot
- Code review: GitHub pull requests
- Prompt engineering: Claude for architecture decisions
- Testing: Jest + Supertest + Playwright

**Typical Sprint (2-week):**
```
Week 1:
  Day 1-2: Feature specification with Claude
  Day 3-4: Implementation (Claude assists with scaffolding)
  Day 5: Testing & peer review

Week 2:
  Day 1-2: Bug fixes & refinement
  Day 3-4: Documentation & deployment
  Day 5: Retrospective & planning
```

**File Structure & Conventions:**
```
backend/
├── src/
│   ├── services/
│   │   ├── auth/
│   │   ├── report/
│   │   ├── analysis/
│   │   ├── dashboard/
│   │   └── export/
│   ├── models/          # Database models
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   ├── jobs/            # BullMQ job handlers
│   ├── config/          # Configuration
│   └── index.ts         # Server entry point
├── __tests__/           # Jest test files
├── .env.example         # Template
├── docker-compose.yml   # Local dev environment
└── README.md            # Setup instructions

Naming conventions:
- Files: camelCase.ts
- Classes: PascalCase
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Database tables: snake_case
```

---

## Deployment Checklist

- [ ] Database migration scripts tested
- [ ] Environment variables configured (.env files)
- [ ] S3 buckets created with encryption & versioning
- [ ] RDS database created with Multi-AZ
- [ ] ElastiCache Redis cluster provisioned
- [ ] ECS cluster & service created
- [ ] Docker image built & pushed to ECR
- [ ] GitHub Actions workflow tested
- [ ] SSL/TLS certificates configured
- [ ] Sentry project created & DSN added
- [ ] PostHog project created & API key added
- [ ] SMS provider (MSG91) account configured
- [ ] Claude API key configured
- [ ] Monitoring & alerting rules set up
- [ ] Load testing completed (verify auto-scaling)
- [ ] Security audit (OWASP compliance)
- [ ] DPDPA compliance review
- [ ] Smoke tests in staging environment
- [ ] Stakeholder approval for production
- [ ] Incident response plan documented

---

## Appendix A: Database Schema (Key Tables)

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  age INT,
  gender VARCHAR(10),  -- male, female, other
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP  -- soft delete
);

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) NOT NULL,  -- uploading, extracting, analyzing, completed, failed
  s3_key VARCHAR(500) NOT NULL,
  file_size_bytes INT,
  page_count INT DEFAULT 0,
  report_date DATE,
  lab_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  extracted_at TIMESTAMP,
  analysis_completed_at TIMESTAMP
);

-- Biomarkers (extracted values)
CREATE TABLE biomarkers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id),
  code VARCHAR(50) NOT NULL,  -- RBC, WBC, etc.
  value DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50),
  reference_min DECIMAL(10, 2),
  reference_max DECIMAL(10, 2),
  status VARCHAR(20) NOT NULL,  -- normal, low, high
  confidence DECIMAL(3, 2),  -- 0.0-1.0
  created_at TIMESTAMP DEFAULT NOW()
);

-- Analyses
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id),
  claude_version VARCHAR(50),
  prompt_tokens INT,
  completion_tokens INT,
  cost_usd DECIMAL(10, 4),
  organ_systems JSONB NOT NULL,  -- JSON structure
  summary TEXT,
  abnormalities JSONB,  -- JSON structure
  recommendations TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sessions (OAuth/JWT state tracking)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  refresh_token_hash VARCHAR(255) UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- OTP records
CREATE TABLE otp_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  attempt_count INT DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Appendix B: Key Environment Variables

```env
# General
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:password@rds-endpoint:5432/longhealth
DATABASE_POOL_SIZE=20
DATABASE_STATEMENT_CACHE_SIZE=25

# Redis
REDIS_URL=redis://redis-endpoint:6379/0
REDIS_PASSWORD=<secure_password>

# AWS
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
S3_BUCKET_PDFS=long-health-pdfs
S3_BUCKET_EXPORTS=long-health-exports

# Authentication
JWT_SECRET=<long_random_string>
JWT_EXPIRY_DAYS=7
REFRESH_TOKEN_EXPIRY_DAYS=30
OTP_EXPIRY_SECONDS=300
MAX_OTP_ATTEMPTS=3

# SMS Provider
SMS_PROVIDER=msg91  # or twilio
MSG91_AUTH_KEY=<key>
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<token>

# Claude API
CLAUDE_API_KEY=<key>
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# OCR Provider
OCR_PROVIDER=google  # or tesseract
GOOGLE_DOCUMENT_AI_PROJECT_ID=<project>
GOOGLE_DOCUMENT_AI_PROCESSOR_ID=<processor>
TESSERACT_PATH=/usr/bin/tesseract

# Monitoring
SENTRY_DSN=<dsn>
POSTHOG_API_KEY=<key>

# Compliance
PRIVACY_POLICY_URL=https://longhealth.app/privacy
TERMS_OF_SERVICE_URL=https://longhealth.app/terms
```

---

**Document End**

This Technical Architecture document provides a complete blueprint for Long Health Phase 1 MVP. It covers system design, security, infrastructure, cost, and team organization suitable for a small, AI-assisted development team.

Last updated: April 2026
