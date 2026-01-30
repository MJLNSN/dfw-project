"""
Parcel API endpoints.
Handles property data queries with access control based on authentication status.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
import struct
import logging

from ..database import get_db
from ..auth import get_optional_user, get_access_level
from ..schemas import SearchRequest

router = APIRouter(prefix="/api/v1/parcels", tags=["parcels"])
logger = logging.getLogger(__name__)


def parse_wkb_point(hex_str: str) -> tuple:
    """
    Parse WKB geometry to extract centroid point coordinates.
    Returns (longitude, latitude) tuple.
    """
    if not hex_str:
        return None, None
    try:
        # Look for point type in the WKB (0101000000 in little endian)
        idx = hex_str.find('0101000000')
        if idx >= 0:
            # Extract 16 bytes for x,y coordinates (each is 8 bytes double)
            point_data = bytes.fromhex(hex_str[idx+10:idx+10+32])
            lng = struct.unpack('<d', point_data[:8])[0]
            lat = struct.unpack('<d', point_data[8:16])[0]
            return lng, lat
    except Exception as e:
        logger.warning(f"Failed to parse WKB: {e}")
    return None, None


def build_parcel_query(
    filters: Optional[dict] = None,
    bbox: Optional[str] = None,
    access_level: str = "guest",
    limit: int = 1000,
    offset: int = 0
) -> tuple:
    """
    Build SQL query for fetching parcels with filters.
    Note: County names in database are lowercase (e.g., 'dallas' not 'Dallas')
    """
    # Query with hex-encoded geometry for parsing
    base_query = """
        SELECT 
            sl_uuid as parcel_id,
            address,
            total_value as price,
            sqft as size_sqft,
            county,
            encode(geom, 'hex') as geom_hex
        FROM takehome.dallas_parcels
        WHERE geom IS NOT NULL
    """
    
    params = {}
    conditions = []
    
    # Guest restriction: only dallas County (lowercase!)
    if access_level == "guest":
        conditions.append("LOWER(county) = :guest_county")
        params["guest_county"] = "dallas"
    
    # Apply filters
    if filters:
        # Price range filter
        price_range = filters.get("priceRange")
        if price_range:
            if price_range.get("min") is not None:
                conditions.append("total_value >= :price_min")
                params["price_min"] = price_range["min"]
            if price_range.get("max") is not None:
                conditions.append("total_value <= :price_max")
                params["price_max"] = price_range["max"]
        
        # Size range filter
        size_range = filters.get("sizeRange")
        if size_range:
            if size_range.get("min") is not None:
                conditions.append("sqft >= :size_min")
                params["size_min"] = size_range["min"]
            if size_range.get("max") is not None:
                conditions.append("sqft <= :size_max")
                params["size_max"] = size_range["max"]
        
        # Counties filter (only for registered users) - convert to lowercase
        counties = filters.get("counties")
        if counties and access_level == "registered":
            lower_counties = [c.lower() for c in counties]
            conditions.append("LOWER(county) = ANY(:counties)")
            params["counties"] = lower_counties
    
    # Note: bbox filtering would require PostGIS functions which aren't available
    # Skip bbox for now
    
    # Combine conditions
    if conditions:
        base_query += " AND " + " AND ".join(conditions)
    
    # Add ordering and pagination
    base_query += " ORDER BY sl_uuid LIMIT :limit OFFSET :offset"
    params["limit"] = limit
    params["offset"] = offset
    
    return base_query, params


def build_count_query(
    filters: Optional[dict] = None,
    access_level: str = "guest"
) -> tuple:
    """Build a count query with the same filters."""
    count_query = """
        SELECT COUNT(*) as total
        FROM takehome.dallas_parcels
        WHERE geom IS NOT NULL
    """
    
    params = {}
    conditions = []
    
    # Guest restriction
    if access_level == "guest":
        conditions.append("LOWER(county) = :guest_county")
        params["guest_county"] = "dallas"
    
    # Apply same filters as main query
    if filters:
        price_range = filters.get("priceRange")
        if price_range:
            if price_range.get("min") is not None:
                conditions.append("total_value >= :price_min")
                params["price_min"] = price_range["min"]
            if price_range.get("max") is not None:
                conditions.append("total_value <= :price_max")
                params["price_max"] = price_range["max"]
        
        size_range = filters.get("sizeRange")
        if size_range:
            if size_range.get("min") is not None:
                conditions.append("sqft >= :size_min")
                params["size_min"] = size_range["min"]
            if size_range.get("max") is not None:
                conditions.append("sqft <= :size_max")
                params["size_max"] = size_range["max"]
        
        counties = filters.get("counties")
        if counties and access_level == "registered":
            lower_counties = [c.lower() for c in counties]
            conditions.append("LOWER(county) = ANY(:counties)")
            params["counties"] = lower_counties
    
    if conditions:
        count_query += " AND " + " AND ".join(conditions)
    
    return count_query, params


@router.get("")
async def get_parcels(
    limit: int = Query(1000, ge=1, le=10000, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price"),
    min_size: Optional[float] = Query(None, ge=0, description="Minimum size (sq ft)"),
    max_size: Optional[float] = Query(None, ge=0, description="Maximum size (sq ft)"),
    counties: Optional[list[str]] = Query(None, description="Filter by counties"),
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_optional_user)
):
    """
    Get parcel data with optional filtering.
    
    - Guest users can only see Dallas County
    - Registered users can see all counties
    """
    access_level = get_access_level(user_id)
    
    # Build filters from query params
    filters = {}
    if min_price is not None or max_price is not None:
        filters["priceRange"] = {"min": min_price, "max": max_price}
    if min_size is not None or max_size is not None:
        filters["sizeRange"] = {"min": min_size, "max": max_size}
    if counties:
        filters["counties"] = counties
    
    filters = filters if filters else None
    
    try:
        # Get count
        count_query, count_params = build_count_query(filters, access_level)
        count_result = db.execute(text(count_query), count_params).fetchone()
        total = count_result[0] if count_result else 0
        
        # Get data
        query, params = build_parcel_query(filters, None, access_level, limit, offset)
        result = db.execute(text(query), params)
        
        # Build features
        features = []
        for row in result:
            lng, lat = parse_wkb_point(row.geom_hex)
            if lng is not None and lat is not None:
                feature = {
                    "type": "Feature",
                    "properties": {
                        "parcel_id": row.parcel_id,
                        "address": row.address,
                        "price": row.price,
                        "size_sqft": row.size_sqft,
                        "county": row.county
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [lng, lat]
                    }
                }
                features.append(feature)
        
        return {
            "type": "FeatureCollection",
            "features": features,
            "metadata": {
                "total": total,
                "returned": len(features),
                "hasMore": (offset + len(features)) < total,
                "accessLevel": access_level
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching parcels: {e}")
        raise HTTPException(status_code=500, detail="Database query failed")


@router.post("/search")
async def search_parcels(
    request: SearchRequest,
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_optional_user)
):
    """
    Advanced search with filters.
    
    - Supports price and size range filters
    - Supports county filtering for registered users
    """
    access_level = get_access_level(user_id)
    
    # Convert Pydantic models to dict
    filters = None
    if request.filters:
        filters = {}
        if request.filters.priceRange:
            filters["priceRange"] = {
                "min": request.filters.priceRange.min,
                "max": request.filters.priceRange.max
            }
        if request.filters.sizeRange:
            filters["sizeRange"] = {
                "min": request.filters.sizeRange.min,
                "max": request.filters.sizeRange.max
            }
        if request.filters.counties:
            filters["counties"] = request.filters.counties
    
    try:
        # Get count
        count_query, count_params = build_count_query(filters, access_level)
        count_result = db.execute(text(count_query), count_params).fetchone()
        total = count_result[0] if count_result else 0
        
        # Get data
        query, params = build_parcel_query(
            filters, request.bbox, access_level, request.limit, request.offset
        )
        result = db.execute(text(query), params)
        
        # Build features
        features = []
        for row in result:
            lng, lat = parse_wkb_point(row.geom_hex)
            if lng is not None and lat is not None:
                feature = {
                    "type": "Feature",
                    "properties": {
                        "parcel_id": row.parcel_id,
                        "address": row.address,
                        "price": row.price,
                        "size_sqft": row.size_sqft,
                        "county": row.county
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [lng, lat]
                    }
                }
                features.append(feature)
        
        return {
            "type": "FeatureCollection",
            "features": features,
            "metadata": {
                "total": total,
                "returned": len(features),
                "hasMore": (request.offset + len(features)) < total,
                "accessLevel": access_level,
                "appliedFilters": filters
            }
        }
        
    except Exception as e:
        logger.error(f"Error searching parcels: {e}")
        raise HTTPException(status_code=500, detail="Database query failed")


@router.get("/{parcel_id}")
async def get_parcel(
    parcel_id: str,
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_optional_user)
):
    """
    Get a single parcel by ID.
    
    - Guest users can only access Dallas County parcels
    """
    access_level = get_access_level(user_id)
    
    query = """
        SELECT 
            sl_uuid as parcel_id,
            address,
            total_value as price,
            sqft as size_sqft,
            county,
            encode(geom, 'hex') as geom_hex
        FROM takehome.dallas_parcels
        WHERE sl_uuid = :parcel_id
    """
    
    # Add county restriction for guests
    if access_level == "guest":
        query += " AND LOWER(county) = 'dallas'"
    
    try:
        result = db.execute(text(query), {"parcel_id": parcel_id}).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Parcel not found")
        
        lng, lat = parse_wkb_point(result.geom_hex)
        geometry = None
        if lng is not None and lat is not None:
            geometry = {
                "type": "Point",
                "coordinates": [lng, lat]
            }
        
        return {
            "type": "Feature",
            "properties": {
                "parcel_id": result.parcel_id,
                "address": result.address,
                "price": result.price,
                "size_sqft": result.size_sqft,
                "county": result.county
            },
            "geometry": geometry
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching parcel {parcel_id}: {e}")
        raise HTTPException(status_code=500, detail="Database query failed")
