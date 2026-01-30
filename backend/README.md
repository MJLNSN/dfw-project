# DFW Property Search Platform - Backend

A FastAPI backend service for the DFW Property Search Platform, providing property data APIs, authentication, and data export capabilities.

## Features

- **Property Data API**: Query and filter property data from PostgreSQL/PostGIS database
- **Authentication**: JWT token verification via AWS Cognito
- **Access Control**: Guest users see Dallas County only; registered users see all counties
- **User Preferences**: Save and manage filter preferences (JSON file storage)
- **CSV Export**: Export filtered property data to CSV format

## Tech Stack

- **Framework**: FastAPI 0.109+
- **Language**: Python 3.11+
- **Database**: PostgreSQL 15+ with PostGIS
- **Authentication**: AWS Cognito (JWT verification)
- **Containerization**: Docker

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI application entry point
│   ├── config.py         # Configuration settings
│   ├── database.py       # Database connection
│   ├── auth.py           # JWT verification
│   ├── models.py         # SQLAlchemy models
│   ├── schemas.py        # Pydantic schemas
│   ├── routers/
│   │   ├── parcels.py    # Property data endpoints
│   │   ├── preferences.py # User preferences endpoints
│   │   └── export.py     # CSV export endpoint
│   └── storage/
│       └── preferences.py # JSON file storage for preferences
├── data/                  # User preferences storage
├── requirements.txt
├── Dockerfile
└── .env.example
```

## API Endpoints

### Property Data

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/parcels` | Get parcels with optional filters | Optional |
| POST | `/api/v1/parcels/search` | Advanced search with filters | Optional |
| GET | `/api/v1/parcels/{parcel_id}` | Get single parcel | Optional |

### User Preferences

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/preferences` | List all preferences | Required |
| POST | `/api/v1/preferences` | Create new preference | Required |
| GET | `/api/v1/preferences/default` | Get default preference | Required |
| GET | `/api/v1/preferences/{id}` | Get specific preference | Required |
| PUT | `/api/v1/preferences/{id}` | Update preference | Required |
| DELETE | `/api/v1/preferences/{id}` | Delete preference | Required |

### Export

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/export/csv` | Export to CSV | Required |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/docs` | Swagger UI |
| GET | `/redoc` | ReDoc |

## Setup

### Prerequisites

- Python 3.11+
- PostgreSQL with PostGIS extension
- AWS Cognito User Pool configured

### Local Development

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # or
   .\venv\Scripts\activate  # Windows
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run the server**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

6. **Access API documentation**
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

### Docker

1. **Build the image**
   ```bash
   docker build -t dfw-backend .
   ```

2. **Run the container**
   ```bash
   docker run -d -p 8000:8000 \
     -e DATABASE_URL=postgresql://takehome:***REMOVED***@108.61.159.122:13432/gis \
     -e AWS_REGION=us-east-2 \
     -e COGNITO_USER_POOL_ID=***REMOVED*** \
     -e COGNITO_CLIENT_ID=***REMOVED*** \
     -e ALLOWED_ORIGINS=http://localhost:3000 \
     dfw-backend
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `AWS_REGION` | AWS Cognito region | `us-east-2` |
| `COGNITO_USER_POOL_ID` | Cognito User Pool ID | Required |
| `COGNITO_CLIENT_ID` | Cognito App Client ID | Required |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `http://localhost:3000` |
| `DEBUG` | Enable debug mode | `True` |
| `LOG_LEVEL` | Logging level | `INFO` |

## Database Schema

The application uses the `takehome.dallas_parcels` table (read-only):

| Field | Mapped Name | Description |
|-------|-------------|-------------|
| `sl_uuid` | `parcel_id` | Unique parcel identifier |
| `address` | `address` | Property address |
| `total_value` | `price` | Property value in USD |
| `sqft` | `size_sqft` | Size in square feet |
| `county` | `county` | County name |
| `geom` | `geometry` | PostGIS geometry |

## Access Control

- **Guest Users**: Can only view Dallas County parcels
- **Registered Users**: Can view all counties, save preferences, and export data

## Error Handling

API returns standardized error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  },
  "metadata": {
    "timestamp": "2024-01-30T10:00:00Z",
    "path": "/api/v1/parcels"
  }
}
```

## License

MIT License

