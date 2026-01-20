# Deployment Guide for PMS System

## Local Development

### Quick Start with Docker Compose

```bash
# Start all services (PostgreSQL, Backend, Frontend)
docker-compose up

# Services will be available at:
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
# PostgreSQL: localhost:5432
```

### Manual Setup

#### 1. Database Setup (PostgreSQL)
```bash
# Install PostgreSQL or use Docker
docker run --name pms-postgres -e POSTGRES_PASSWORD=password -d -p 5432:5432 postgres:15-alpine

# Create database
createdb -U postgres pms_db
```

#### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Update .env with your PostgreSQL credentials:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/pms_db"

# Initialize database
npm run prisma:migrate
npm run prisma:generate

# Start development server
npm run dev
```

#### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Production Deployment

### Backend Deployment (Heroku/Railway)

#### Option 1: Using Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create pms-backend

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set JWT_SECRET="your_secure_secret_key"
heroku config:set NODE_ENV="production"

# Deploy
git push heroku main

# Run migrations
heroku run npm run prisma:migrate
```

#### Option 2: Using Railway

```bash
# Login to Railway
railway login

# Initialize project
railway init

# Add PostgreSQL service
railway service add --type postgres

# Deploy
railway up
```

### Frontend Deployment

#### Option 1: Using Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel

# Configure build settings
# Build command: npm run build
# Output directory: dist
```

#### Option 2: Using Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
cd frontend
netlify deploy --prod --dir=dist
```

### Docker Production Build

```bash
# Build images
docker build -t pms-backend:1.0 ./backend
docker build -t pms-frontend:1.0 ./frontend

# Run with Docker Compose for production
docker-compose -f docker-compose.prod.yml up -d
```

## Environment Variables

### Backend (.env)
```
# Database
DATABASE_URL="postgresql://user:password@host:5432/pms_db"

# Server
PORT=5000
NODE_ENV=production

# Authentication
JWT_SECRET="use_a_very_strong_random_key_here"
JWT_EXPIRE="7d"

# Booking.com Integration
BOOKING_COM_API_KEY="your_booking_com_api_key"
BOOKING_COM_API_URL="https://api.booking.com/v1"

# Email (Optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_app_password"
```

### Frontend (.env)
```
REACT_APP_API_URL=https://your-api-domain.com/api
```

## Database Migrations

```bash
# Create new migration
npm run prisma:migrate -- --name migration_name

# Reset database (dev only)
npm run prisma:migrate reset

# View database in Prisma Studio
npm run prisma:studio
```

## Security Checklist

- [ ] Change JWT_SECRET to a strong random value
- [ ] Use HTTPS in production
- [ ] Enable CORS only for your domain
- [ ] Set database password to strong value
- [ ] Enable database backups
- [ ] Add rate limiting to API
- [ ] Use environment variables for all secrets
- [ ] Enable firewall rules
- [ ] Regular security updates
- [ ] Monitor error logs
- [ ] Implement request logging

## Performance Optimization

### Backend
```typescript
// Add caching headers
app.use((req, res, next) => {
  res.header('Cache-Control', 'public, max-age=3600');
  next();
});

// Enable compression
import compression from 'compression';
app.use(compression());
```

### Frontend
```bash
# Analyze bundle size
npm run build -- --analyze

# Optimize images
# Use WebP format for images
# Implement lazy loading
```

## Monitoring & Logging

### Application Monitoring
```bash
# Install monitoring tools
npm install pm2 -g
npm install newrelic

# Start with PM2
pm2 start dist/index.js --name "pms-backend"
pm2 save
pm2 startup
```

### Logging
```bash
# View logs
pm2 logs pms-backend

# Set up log rotation
npm install winston
```

## Backup Strategy

### Database Backups
```bash
# Manual backup
pg_dump pms_db > backup.sql

# Restore backup
psql pms_db < backup.sql

# Automated backups (cron job)
0 2 * * * pg_dump pms_db | gzip > /backups/pms_db_$(date +\%Y\%m\%d).sql.gz
```

## CI/CD Pipeline Example (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy PMS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build Backend
        run: |
          cd backend
          npm install
          npm run build
      
      - name: Build Frontend
        run: |
          cd frontend
          npm install
          npm run build
      
      - name: Deploy to Production
        run: |
          # Your deployment commands here
```

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
psql -U postgres -h localhost -d pms_db

# Check Prisma connection
npm run prisma:db push
```

### API Errors
```bash
# Check backend logs
pm2 logs pms-backend

# Test API endpoint
curl http://localhost:5000/api/health
```

### Frontend Issues
```bash
# Clear cache
npm cache clean --force

# Rebuild
npm run build

# Check build errors
npm run build -- --verbose
```

## Scaling Considerations

1. **Database**: Use read replicas, connection pooling
2. **Backend**: Load balance multiple instances
3. **Frontend**: CDN for static assets
4. **Caching**: Redis for session/data caching
5. **Message Queue**: For async operations (RabbitMQ/Redis)

## Cost Optimization

- Use serverless functions for batch operations
- Optimize database queries
- Implement request caching
- Use CDN for frontend
- Auto-scale based on traffic
- Archive old booking data

## Support & Updates

- Keep dependencies updated: `npm update`
- Security patches: `npm audit fix`
- Monitor performance metrics
- Set up alerting for errors
- Plan regular maintenance windows

---

For more information, see README.md
