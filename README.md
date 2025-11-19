# FarmFlow v3

A comprehensive farm management system for microgreens and mushroom cultivation operations.

## Features

### Phase 1 Complete

- **P1-1: Multi-Tenancy & Accounts** - Full account system with subscriptions, modules, and feature flags
- **P1-2: Production Abstraction** - Unified crop and production system
- **P1-3: Standing Orders** - Recurring order scheduler with auto-generation
- **P1-4: Sowing Planner** - Demand-driven planning with waste buffers
- **P1-5: Unified Batches** - Combined microgreen and mushroom batch tracking
- **P1-6: Enhanced Tasks** - Auto-generated tasks with QR workflows
- **P1-7: Dashboard & Reports** - Today dashboard, reports, CSV exports

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Local Development

1. **Clone and install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Create PostgreSQL database:**
   ```bash
   createdb farmflow_v3
   ```

4. **Seed the database:**
   ```bash
   npm run seed
   ```

5. **Start the server:**
   ```bash
   npm run dev
   ```

6. **API is now running at:** `http://localhost:3000`

### Docker Deployment

```bash
cd deployment
docker-compose up -d
```

This starts:
- PostgreSQL database on port 5432
- FarmFlow API on port 3000

To seed the database:
```bash
docker-compose exec api npm run seed
```

## Demo Credentials

After seeding:
- **Email:** demo@brightoasisfarm.com
- **Password:** password123

## API Reference

### Authentication

All API routes (except auth) require:
- Bearer token in `Authorization` header
- Account ID in `X-Account-Id` header

#### Login
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "demo@brightoasisfarm.com",
  "password": "password123"
}
```

Response:
```json
{
  "user": { ... },
  "accounts": [{ "id": "uuid", "name": "...", "role": "owner" }],
  "token": "jwt...",
  "refreshToken": "jwt..."
}
```

### Core Endpoints

#### Dashboard
```bash
GET /api/dashboard/today
GET /api/dashboard/week
GET /api/dashboard/kpis
```

#### Batches
```bash
GET /api/batches
POST /api/batches
GET /api/batches/:id
PATCH /api/batches/:id/status
POST /api/batches/:id/harvest
POST /api/batches/:id/move
GET /api/batches/ready-to-harvest
```

#### Orders
```bash
GET /api/orders
POST /api/orders
GET /api/orders/:id
PUT /api/orders/:id
PATCH /api/orders/:id/status
```

#### Standing Orders
```bash
GET /api/standing-orders
POST /api/standing-orders
PUT /api/standing-orders/:id
POST /api/standing-orders/:id/pause
POST /api/standing-orders/:id/resume
POST /api/standing-orders/generate
```

#### Tasks
```bash
GET /api/tasks
GET /api/tasks/today
GET /api/tasks/overdue
POST /api/tasks
POST /api/tasks/:id/complete
POST /api/tasks/:id/skip
```

#### Planning
```bash
GET /api/planning/sowing-plan
POST /api/planning/create-batches
GET /api/planning/forecast
GET /api/planning/capacity
GET /api/planning/demand-supply/:productId
```

#### Reports
```bash
GET /api/reports/harvest-summary
GET /api/reports/sales-summary
GET /api/reports/production-efficiency
GET /api/reports/export/:type
```

#### Reference Data
```bash
GET /api/locations
GET /api/crop-types
GET /api/products
GET /api/customers
```

## Project Structure

```
farmflow-v3/
├── backend/
│   ├── config/           # Configuration (roles, tiers, modules)
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Auth, tenancy, permissions
│   ├── models/           # Sequelize models
│   ├── routes/           # API routes
│   ├── scripts/          # Seed and migration scripts
│   ├── services/         # Business logic
│   ├── server.js         # Main entry point
│   └── package.json
├── deployment/
│   └── docker-compose.yml
└── frontend/             # (Coming in Phase 2)
```

## Database Schema

### Core Models

- **Account** - Multi-tenant organization
- **User** - Authentication and profile
- **AccountMember** - User-Account relationship with roles

### Production

- **CropType** - Microgreen and mushroom definitions
- **ProductionBatch** - Growing batches with status tracking
- **BatchHarvest** - Individual harvest records
- **BatchMovement** - Location tracking
- **Location** - Physical spaces

### Commerce

- **Customer** - Customer profiles
- **Product** - Sellable items
- **Order** - Sales orders
- **OrderItem** - Line items
- **StandingOrder** - Recurring templates

### Operations

- **Task** - Work tasks (manual and auto-generated)
- **ActivityLog** - Audit trail

## Subscription Tiers

| Feature | Free | Starter | Pro | Enterprise |
|---------|------|---------|-----|------------|
| Users | 1 | 3 | 10 | Unlimited |
| Locations | 3 | 5 | 10 | Unlimited |
| Monthly Orders | 50 | 200 | 1000 | Unlimited |
| Standing Orders | ❌ | ✅ | ✅ | ✅ |
| Advanced Planning | ❌ | ❌ | ✅ | ✅ |
| API Access | ❌ | ❌ | ✅ | ✅ |
| Customer Portal | ❌ | ❌ | ❌ | ✅ |

## User Roles

- **Owner** - Full access
- **Admin** - Administrative access
- **Manager** - Operational management
- **Worker** - Day-to-day operations
- **Viewer** - Read-only access

## Workflow Examples

### Creating a Batch with Auto-Tasks

```javascript
POST /api/batches
{
  "cropTypeId": "uuid",
  "productionType": "microgreens_tray",
  "quantity": 10,
  "plannedSowDate": "2024-01-15",
  "locationId": "uuid",
  "generateTasks": true
}
```

This automatically creates tasks for:
- Sow (Day 0)
- Water (Day 0)
- Move to grow room (Day 3)
- Harvest (Day 10)

### Generating Orders from Standing Orders

```javascript
POST /api/standing-orders/generate
{
  "forDate": "2024-01-15"
}
```

This checks all standing orders and creates regular orders for those scheduled on that date.

### Sowing Plan Generation

```javascript
GET /api/planning/sowing-plan?startDate=2024-01-15&endDate=2024-01-29&wasteBuffer=0.1
```

Returns what to plant and when based on upcoming order demand.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment | development |
| PORT | Server port | 3000 |
| DB_HOST | Database host | localhost |
| DB_PORT | Database port | 5432 |
| DB_NAME | Database name | farmflow_v3 |
| DB_USER | Database user | farmflow_user |
| DB_PASSWORD | Database password | - |
| JWT_SECRET | JWT signing key | - |
| JWT_EXPIRES_IN | Token expiry | 7d |
| CORS_ORIGIN | Allowed origins | * |

## Next Steps (Phase 2)

- Frontend React application
- Mobile-responsive dashboard
- QR code scanner
- Real-time notifications
- Stripe integration

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details.

---

Built for Bright Oasis Farm 🌱
