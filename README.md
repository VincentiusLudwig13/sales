# Salesman Tools

A mobile-first Progressive Web App (PWA) built with **Next.js** for field sales teams. 

> 📖 For deep technical reference (schema, API flows, glossary, deployment), see **[DOCUMENTATION.md](./DOCUMENTATION.md)**.

---

## 🔄 End-to-End App Flow

The application handles the complete daily cycle of a field salesman and the corresponding approval actions by the back-office admin.

### High-Level Architecture

```mermaid
graph TD
    Salesman[Salesman Mobile PWA] <-->|API Calls| NextJS[Next.js Server]
    Admin[Admin Desktop Portal] <-->|API Calls| NextJS
    NextJS <-->|Prisma ORM| Database[(PostgreSQL/SQLite)]
```

### Daily Operational Flow

```mermaid
sequenceDiagram
    autonumber
    actor Salesman as Salesman (Mobile)
    actor Admin as Admin (Desktop)
    participant App as System

    %% Morning Phase
    Note over Salesman, App: 🌅 Morning: Loading Prep
    Salesman->>App: Submits Product & POSM Loading Reports
    App-->>Salesman: Status: PENDING (Route is Locked 🔒)
    Admin->>App: Reviews & Approves Loading Reports
    App-->>Salesman: Status: APPROVED (Route Unlocks 🔓)

    %% Field Operations
    Note over Salesman, App: 🚙 Mid-Day: Field Visits
    loop For each Outlet in Route
        Salesman->>App: Checks GPS Distance (< 50m)
        App-->>Salesman: Enables Visit Button
        
        Note over Salesman, App: Store Audits
        Salesman->>App: Performs Stock & POSM Checks
        
        Note over Salesman, App: Sales & Collections
        Salesman->>App: Submits Order (Qty, Discount, Terms)
        Salesman->>App: Records Returns & Cash Collected
        
        Note over App: System calculates FIFO Debt Settlement
    end

    %% Back Office Settlement
    Note over Admin, App: 🏢 Back-Office: Finance
    Admin->>App: Reviews Pending Payment Settlements
    Admin->>App: Approves Payments (Updates Ledger)

    %% End of Day
    Note over Salesman, App: 🌙 End of Day
    Salesman->>App: Clicks "Close Today's Route"
    App-->>Salesman: Route Locked for the Day
```
---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup local database & seed data
npx prisma migrate dev
npx prisma db seed

# Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.
