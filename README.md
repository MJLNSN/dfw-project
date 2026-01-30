# DFW Property Search Platform

A full-stack real estate property search and visualization platform for the Dallas-Fort Worth area. Users can explore property data through an interactive map, filter by various criteria, and export data for analysis.

## Live Demo

- **Frontend**: [https://dfw-project.vercel.app](https://dfw-project.vercel.app)
- **Backend API**: [https://your-backend-url.com](https://your-backend-url.com)
- **API Documentation**: [https://your-backend-url.com/docs](https://your-backend-url.com/docs)

## Features

### User Stories Implemented

| ID | User Story | Status |
|:---|:-----------|:------:|
| **ST-01** | **Secure & Personalized Access** - New users need to create an account | ✅ |
| **ST-02** | **Frictionless Entry** - Visitors can explore the map and parcel data immediately without registration | ✅ |
| **ST-03** | **Restricted County Visibility** - Only registered users can see the full dataset, non-registered users can only see Dallas county | ✅ |
| **ST-04** | **Custom Search & Persistence** - Users can filter properties by price and size, and save those filters | ✅ |
| **ST-05** | **Data Export** - Users export filtered results into a CSV format | ✅ |

### Core Features

- **Interactive Map**: Mapbox-powered map with clustering, color-coded price visualization
- **User Authentication**: AWS Cognito integration with email verification
- **Access Control**: Guest users see Dallas County only; registered users see all DFW counties
- **Advanced Filtering**: Filter by price range and property size
- **Saved Preferences**: Save and manage filter presets (authenticated users)
- **CSV Export**: Export filtered property data for spreadsheet analysis

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- Mapbox GL JS (mapping)
- Zustand + TanStack Query (state management)
- React Router (routing)
- Amazon Cognito Identity JS (authentication)

### Backend
- Python FastAPI
- PostgreSQL + PostGIS
- SQLAlchemy (ORM)
- Docker
- JWT Authentication (Cognito token validation)

## Project Structure

```
dfw-property-search/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── main.py         # Application entry point
│   │   ├── config.py       # Configuration settings
│   │   ├── database.py     # Database connection
│   │   ├── auth.py         # JWT verification
│   │   ├── models.py       # SQLAlchemy models
│   │   ├── schemas.py      # Pydantic schemas
│   │   ├── routers/        # API endpoints
│   │   └── storage/        # JSON file storage
│   ├── requirements.txt
│   ├── Dockerfile
│   └── README.md
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API & Cognito services
│   │   ├── store/          # Zustand stores
│   │   └── types/          # TypeScript types
│   ├── package.json
│   ├── Dockerfile
│   └── README.md
├── docker-compose.yml
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker (optional)

### Option 1: Automated Setup (Recommended)

Use the provided `start.sh` script for quick setup:

```bash
# Make script executable
chmod +x start.sh

# Run the script
./start.sh
```

The script will:
- ✅ Check for Docker Compose and use it if available
- ✅ Or start services manually (backend + frontend)
- ✅ Create virtual environment for backend
- ✅ Install all dependencies
- ✅ Create `.env` and `.env.local` files from examples
- ✅ Start both services

**Note**: After first run, edit the configuration files:
- `backend/.env` - Add your AWS Cognito credentials
- `frontend/.env.local` - Add your Mapbox token and AWS Cognito credentials

Then restart services with `./start.sh`

### Option 2: Manual Setup

#### Step 1: Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or .\venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp env.example .env
# Edit .env with your AWS Cognito credentials (database is pre-configured)

# Run the server
uvicorn app.main:app --reload --port 8000
```

**Backend will be available at:**
- API: http://localhost:8000
- Interactive API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

#### Step 2: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
cp env.example .env.local
# Edit .env.local with your Mapbox token and AWS Cognito credentials

# Start development server
npm run dev
```

**Frontend will be available at:**
- Application: http://localhost:5173

### Option 3: Docker (Full Stack)

```bash
# Start all services
docker-compose up -d

# Access:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:8000
# - API Docs: http://localhost:8000/docs
```

## Testing the Application

### 1. Open Frontend
Navigate to http://localhost:5173
- You should see the map with Dallas County properties
- Guest banner should be visible at the top

### 2. Test API
Navigate to http://localhost:8000/docs
- Interactive Swagger UI documentation
- Try the `/health` endpoint to verify backend is running

### 3. Test User Registration
- Click "Get Started" or "Register"
- Enter email and password (must meet requirements: 8+ chars, uppercase, lowercase, number, special char)
- Check email for verification code
- Verify and login

### 4. Test Features
- ✅ **Map Exploration** (guest mode) - View Dallas County properties
- ✅ **Property Details** - Click on property markers for details
- ✅ **Quick Filters** - Use preset filter buttons
- ✅ **Advanced Filters** (after login) - Custom price/size ranges
- ✅ **Save Tags** (after login) - Save custom filter combinations
- ✅ **CSV Export** (after login) - Export filtered results

## Stopping Services

```bash
# Find and kill processes
pkill -f "npm run dev"
pkill -f "uvicorn"

# Or use Ctrl+C in each terminal
```

## API Endpoints

### Properties

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/parcels` | Get properties (with filters) | Optional |
| POST | `/api/v1/parcels/search` | Advanced search | Optional |
| GET | `/api/v1/parcels/{id}` | Get single property | Optional |

### Preferences

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/preferences` | List saved preferences | Required |
| POST | `/api/v1/preferences` | Create preference | Required |
| PUT | `/api/v1/preferences/{id}` | Update preference | Required |
| DELETE | `/api/v1/preferences/{id}` | Delete preference | Required |

### Export

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/export/csv` | Export to CSV | Required |

## Environment Variables

### Backend (.env)

```env
# Database Configuration
DATABASE_URL=postgresql://takehome:***REMOVED***@108.61.159.122:13432/gis

# AWS Cognito Configuration
AWS_REGION=us-east-2
COGNITO_USER_POOL_ID=your_pool_id
COGNITO_CLIENT_ID=your_client_id

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend (.env.local)

```env
# Backend API URL
VITE_API_URL=http://localhost:8000

# Mapbox Configuration
# Get your token from: https://account.mapbox.com/access-tokens/
# Required scopes: styles:tiles, styles:read, fonts:read, datasets:read
VITE_MAPBOX_TOKEN=your_mapbox_token

# AWS Cognito Configuration
VITE_AWS_REGION=us-east-2
VITE_COGNITO_USER_POOL_ID=your_pool_id
VITE_COGNITO_CLIENT_ID=your_client_id
```

**Important Notes:**
- Frontend uses `.env.local` for local development (not `.env`)
- `.env.local` is gitignored and won't be committed
- For production deployment (Vercel), set these as environment variables in the dashboard

## Database Schema

The application uses the existing `takehome.dallas_parcels` table:

| Field | Mapped Name | Description |
|-------|-------------|-------------|
| `sl_uuid` | `parcel_id` | Unique identifier |
| `address` | `address` | Property address |
| `total_value` | `price` | Property value (USD) |
| `sqft` | `size_sqft` | Size in square feet |
| `county` | `county` | County name |
| `geom` | `geometry` | PostGIS geometry |

## Deployment

### Frontend (Vercel)

1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `VITE_API_URL` - Your backend URL
   - `VITE_MAPBOX_TOKEN` - Your Mapbox access token
   - `VITE_AWS_REGION` - AWS region (e.g., us-east-2)
   - `VITE_COGNITO_USER_POOL_ID` - Cognito User Pool ID
   - `VITE_COGNITO_CLIENT_ID` - Cognito Client ID
3. Deploy

### Backend (Railway/Heroku/EC2)

1. Build Docker image:
   ```bash
   docker build -t dfw-backend ./backend
   ```

2. Push to container registry

3. Deploy with environment variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `AWS_REGION` - AWS region
   - `COGNITO_USER_POOL_ID` - Cognito User Pool ID
   - `COGNITO_CLIENT_ID` - Cognito Client ID
   - `ALLOWED_ORIGINS` - Frontend URL for CORS

## Troubleshooting

### Frontend Issues
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend Issues
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Database Connection
- Verify database is accessible at `108.61.159.122:13432`
- Check credentials in `backend/.env`
- Test connection: `psql -h 108.61.159.122 -p 13432 -U takehome -d gis`

### Mapbox Issues
- Ensure your Mapbox token has required scopes:
  - `styles:tiles`
  - `styles:read`
  - `fonts:read`
  - `datasets:read`
- Create a new token at: https://account.mapbox.com/access-tokens/

## License

MIT License

## Author

Built as a take-home project for LocateAlpha

# dfw-project
