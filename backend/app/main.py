"""
DFW Property Search Platform - Backend API

A FastAPI application that provides:
- Property data API with access control
- JWT authentication via AWS Cognito
- User preference management
- CSV data export
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import logging
import sys
import time

from .config import get_settings
from .routers import parcels, preferences, export
from .database import engine

# Configure logging with clean format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)]
)

# Set up logger
logger = logging.getLogger(__name__)

# Silence SQLAlchemy's verbose logging
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.dialects").setLevel(logging.WARNING)

# Get settings
settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title="DFW Property Search API",
    description="API for searching and visualizing Dallas-Fort Worth area property data",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log incoming requests with timing information."""
    start_time = time.time()
    
    # Skip logging for health check to reduce noise
    if request.url.path == "/health":
        return await call_next(request)
    
    # Log incoming request
    logger.info(f"→ {request.method} {request.url.path}")
    
    # Process request
    response = await call_next(request)
    
    # Calculate duration
    duration = time.time() - start_time
    
    # Log response
    status_emoji = "✓" if response.status_code < 400 else "✗"
    logger.info(f"{status_emoji} {request.method} {request.url.path} - {response.status_code} ({duration:.2f}s)")
    
    return response


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(parcels.router)
app.include_router(preferences.router)
app.include_router(export.router)


@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    logger.info("=" * 60)
    logger.info("🚀 DFW Property Search API Starting")
    logger.info("=" * 60)
    logger.info(f"📝 Debug Mode: {settings.debug}")
    logger.info(f"🌐 Allowed Origins: {len(settings.allowed_origins_list)} configured")
    
    # Test database connection
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("✓ Database connection successful")
    except Exception as e:
        logger.error(f"✗ Database connection failed: {e}")
    
    logger.info("=" * 60)
    logger.info("✅ API Ready")
    logger.info("=" * 60)


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown."""
    logger.info("=" * 60)
    logger.info("🛑 Shutting down DFW Property Search API")
    logger.info("=" * 60)


@app.get("/", tags=["root"])
async def root():
    """Root endpoint - API information."""
    return {
        "name": "DFW Property Search API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health", tags=["health"])
async def health_check():
    """
    Health check endpoint.
    
    Returns database connection status.
    """
    from sqlalchemy import text
    db_status = "healthy"
    
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        db_status = "unhealthy"
    
    return {
        "status": "ok" if db_status == "healthy" else "degraded",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "database": db_status
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "details": None
            },
            "metadata": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "path": str(request.url.path)
            }
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )

