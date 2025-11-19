# FarmFlow v2 Complete - Full Production Package

## Quick Update Instructions

Copy these files to your existing installation:

1. **Replace frontend:**
   ```bash
   cp frontend/index.html ~/farmflow/farmflow-v2/frontend/
   ```

2. **Replace seed script (for comprehensive crop database):**
   ```bash
   cp backend/scripts/seed.js ~/farmflow/farmflow-v2/backend/scripts/
   ```

3. **Re-run seed to get new crops:**
   ```bash
   sudo docker exec -it farmflow-api node scripts/seed.js
   ```

4. **Restart containers:**
   ```bash
   cd ~/farmflow/farmflow-v2/deployment
   sudo docker-compose down
   sudo docker-compose up -d
   ```

## What's Included

### Complete Frontend Features:
- ✅ Orders page with full Add Order modal
- ✅ Multiple products per order
- ✅ Add new customer inline
- ✅ Date type (Harvest/Start)
- ✅ Delivery offset options
- ✅ Recurring orders
- ✅ Edit/Delete orders
- ✅ Bulk select/delete
- ✅ Tasks page with List/Daily/Weekly/Monthly views
- ✅ Export tasks to CSV
- ✅ Complete task details
- ✅ Crops page with full database display
- ✅ Customers page with CRUD
- ✅ Batches page
- ✅ Reports/Dashboard

### Comprehensive Crop Database:
- 45+ microgreens varieties
- 10 mushroom varieties
- All growing parameters included

## Login

Email: demo@farmflow.com
Password: demo123456
