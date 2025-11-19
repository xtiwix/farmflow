# FarmFlow v2 - Backend

Complete farm management system with microgreens and mushroom cultivation tracking.

## Features

- **45+ Microgreen Varieties** with soak times, blackout days, and yield tracking
- **30+ Mushroom Strains** with complete cultivation parameters from Cap N Stem
- **Customer Management** with price tiers (Retail, Restaurant, Wholesale)
- **Order Management** with products and pricing
- **Task Generation** based on cultivation parameters
- **Block Tracking** with movements, harvests, and yield data

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 2. Setup Database

```bash
# Create PostgreSQL database
createdb farmflow_db

# Or using psql
psql -c "CREATE DATABASE farmflow_db;"
psql -c "CREATE USER farmflow_user WITH PASSWORD 'your_password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE farmflow_db TO farmflow_user;"
```

### 3. Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Seed Database

```bash
npm run seed
```

### 6. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

## Database Schema

### Core Models

- **User** - Farm workers with roles (admin, manager, worker)
- **Farm** - Farm configuration
- **Location** - Rooms/areas with environmental targets

### Crops & Species

- **Crop** - Microgreen varieties with cultivation parameters
- **MushroomSpecies** - Mushroom strains with complete parameters:
  - Substrate requirements
  - Moisture percentages
  - Incubation temps/days
  - Fruiting temps/humidity/CO2
  - Yield expectations
  - Initiation methods
  - Cultivation notes

### Products & Pricing

- **PriceTier** - Retail, Restaurant, Wholesale
- **Product** - Sellable items (linked to Crop or MushroomSpecies)
- **ProductPrice** - Price per product per tier

### Tracking

- **MicrogreenTray** - Individual tray tracking
- **MushroomBatch** - Block batch from supplier
- **MushroomBlock** - Individual block lifecycle
- **BlockHarvest** - Harvest records per flush

### Operations

- **Customer** - Customer accounts with price tier
- **Order** - Orders with items
- **Task** - Manual and auto-generated tasks

## Mushroom Cultivation Data

The database includes comprehensive cultivation parameters for 30+ strains:

### Oyster Varieties
- Blue Oyster (6 strains)
- Gold Oyster
- Phoenix Oyster
- Pink Oyster
- White Oyster
- King Oyster (3 strains)
- Black Pearl Oyster

### Specialty Species
- Lion's Mane (3 strains including heat-tolerant)
- Comb Tooth
- Shiitake (3 strains)
- Chestnut
- Maitake
- Pioppino
- Enoki (Gold)
- Reishi (2 species)
- Brown Beech (Buna Shimeji)

Each strain includes:
- Substrate requirements and moisture %
- Incubation temperature and duration
- Fruiting temperature, humidity, CO2 targets
- Days to harvest and harvest window
- Expected yield per 10lb block
- Initiation methods and fruiting techniques
- Cultivation notes and characteristics

## API Endpoints (Coming Soon)

```
POST   /api/auth/login
POST   /api/auth/register

GET    /api/crops
GET    /api/species
GET    /api/species/:id/tasks  # Auto-generated tasks based on parameters

GET    /api/customers
POST   /api/customers
GET    /api/orders
POST   /api/orders

GET    /api/batches
POST   /api/batches
GET    /api/blocks/:id
POST   /api/blocks/:id/harvest
POST   /api/blocks/:id/move

GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks/:id/complete
```

## Task Auto-Generation

The system uses mushroom species parameters to auto-generate tasks:

1. **Check Colonization** - Based on `incubationDaysMin`
2. **Move to Fruiting** - Based on `incubationDaysMax`
3. **Cold Shock** - If `coldShockRequired` is true
4. **Check for Pins** - Based on fruiting start
5. **Harvest Window** - Based on `daysToFirstHarvest`
6. **Second Flush Prep** - Based on `flushCount`

## Contributing

1. Fork the repository
2. Create feature branch
3. Submit pull request

## License

MIT
