# Prowider Mini Lead Distribution System

A robust, highly-concurrent Lead Distribution System built with **Next.js (App Router)** and **PostgreSQL (Prisma)**. 
This system is designed to handle high-frequency concurrent lead submissions, ensuring data integrity, strict quota management, and fair round-robin provider distribution using Postgres `Serializable` transactions.

## 🚀 Features

* **Strict Backend Concurrency**: Lead allocation is wrapped in a `Serializable` database transaction. If 10 requests hit the server at the exact same millisecond, they are queued and processed sequentially.
* **Idempotent Webhooks**: Uses a database-backed idempotency lock (`WebhookEvent`) to ensure provider quotas are never double-reset, even if payment gateways retry identical payloads during network failures.
* **Real-Time Dashboard (SSE)**: The frontend provider dashboard updates instantly via Server-Sent Events (SSE) without requiring a manual page refresh when new leads are assigned.
* **Intelligent Routing Logic**: Distributes leads based on mandatory provider pools and fair round-robin pooling. State is persisted in the database so fair distribution survives server restarts.
* **Built-in Load Testing**: Includes a `/test-tools` suite to instantly fire concurrent lead generations and idempotent requests to prove architectural stability.

## 🛠️ Tech Stack

* **Framework:** Next.js 15+ (App Router)
* **Database:** PostgreSQL
* **ORM:** Prisma
* **Styling:** Tailwind CSS
* **Language:** TypeScript

## 📦 Getting Started

### 1. Database Setup
You must have a PostgreSQL instance running locally. Create a database (e.g. `leaddb`) and update the `DATABASE_URL` in your `.env` file.

```env
DATABASE_URL="postgres://postgres:YOUR_PASSWORD@localhost:5432/leaddb?sslmode=disable"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize & Seed Database
This will create the necessary tables and inject the initial Services and Providers.
```bash
npx prisma db push
npx prisma db seed
```

### 4. Run the Development Server
```bash
npm run dev
```

## 🗺️ Application Routes

### Public Forms & UI
- **`/request-service`**: The public-facing form where users submit a lead. Submitting this form triggers the allocation algorithm.
- **`/dashboard`**: The real-time Provider Dashboard. Displays remaining quotas and assigned leads. Updates instantly via SSE.
- **`/test-tools`**: A testing environment to simulate webhook quota resets, test idempotency, and stress-test the concurrency algorithm by generating 10 simultaneous leads.

### API Routes
- **`POST /api/leads`**: Accepts new leads and triggers the `processLeadAssignment` transaction.
- **`POST /api/webhook/reset-quota`**: Resets all provider quotas to 10. Requires a unique `eventId` payload to guarantee idempotency.
- **`GET /api/sse`**: The Server-Sent Events stream endpoint for live dashboard updates.

## 🧠 Architectural Highlights

### Transactional Allocation Logic
Located in `src/lib/leadAllocation.ts`, the allocation algorithm guarantees no provider exceeds their monthly quota of 10 leads. By utilizing mathematical `increment: 1` updates inside a `Serializable` transaction block, the system completely mitigates race conditions that typically plague high-scale distribution systems.

### Idempotency Engine
Located in `src/app/api/webhook/reset-quota/route.ts`, the webhook processing creates a unique row in the `WebhookEvent` table using the webhook's ID as the Primary Key. If 5 duplicate payloads fire simultaneously, the database engine enforces a Unique Constraint Violation on 4 of them, ensuring the heavy `updateMany` quota reset operation fires exactly once.
