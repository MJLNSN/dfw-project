"""
Data export API endpoints.
Allows authenticated users to export filtered property data as CSV.

ST-05: Users export filtered results into a CSV format so they can analyze the data.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
import csv
import io
from datetime import datetime
import logging

from ..database import get_db
from ..auth import require_auth, get_access_level
from ..schemas import ExportRequest
from ..config import get_settings

router = APIRouter(prefix="/api/v1/export", tags=["export"])
settings = get_settings()
logger = logging.getLogger(__name__)

# CSV column headers for property export
CSV_COLUMNS = ["Parcel ID", "Address", "Price (USD)", "Size (sq ft)", "County"]
CSV_COLUMNS_WITH_DISTANCE = ["Parcel ID", "Address", "Distance (miles)", "Price (USD)", "Size (sq ft)", "County"]


def build_export_query(
    filters: dict = None, 
    access_level: str = "registered",
    center_point: dict = None,
    max_distance: float = None,
    sort_by: str = "price_desc"
) -> tuple:
    """
    Build SQL query for CSV export of filtered properties.
    
    Only exports properties with valid information (address, price).
    Optionally filters by distance from a center point.
    
    Args:
        filters: Filter criteria (price range, size range, counties)
        access_level: User access level
        center_point: Dict with longitude, latitude for distance filtering
        max_distance: Maximum distance in miles from center point
        sort_by: Sort order (distance, price_asc, price_desc, size_asc, size_desc)
        
    Returns:
        Tuple of (query_string, params_dict, has_distance)
    """
    params = {}
    conditions = []
    has_distance = center_point is not None and max_distance is not None and max_distance > 0
    
    # Build SELECT clause
    if has_distance:
        # Include distance calculation using Haversine formula
        query = """
            SELECT 
                sl_uuid as parcel_id,
                address,
                total_value as price,
                sqft as size_sqft,
                county,
                3959 * acos(
                    cos(radians(:center_lat)) * cos(radians(public.ST_Y(public.ST_Centroid(geom)))) * 
                    cos(radians(public.ST_X(public.ST_Centroid(geom))) - radians(:center_lng)) + 
                    sin(radians(:center_lat)) * sin(radians(public.ST_Y(public.ST_Centroid(geom))))
                ) as distance_miles
            FROM takehome.dallas_parcels
            WHERE geom IS NOT NULL
            AND address IS NOT NULL 
            AND address != ''
            AND total_value IS NOT NULL 
            AND total_value > 1000
        """
        params["center_lng"] = center_point["longitude"]
        params["center_lat"] = center_point["latitude"]
        
        # Distance filter
        conditions.append("""
            3959 * acos(
                cos(radians(:center_lat)) * cos(radians(public.ST_Y(public.ST_Centroid(geom)))) * 
                cos(radians(public.ST_X(public.ST_Centroid(geom))) - radians(:center_lng)) + 
                sin(radians(:center_lat)) * sin(radians(public.ST_Y(public.ST_Centroid(geom))))
            ) <= :max_distance_miles
        """)
        params["max_distance_miles"] = max_distance
    else:
        # Standard query without distance
        query = """
            SELECT 
                sl_uuid as parcel_id,
                address,
                total_value as price,
                sqft as size_sqft,
                county
            FROM takehome.dallas_parcels
            WHERE geom IS NOT NULL
            AND address IS NOT NULL 
            AND address != ''
            AND total_value IS NOT NULL 
            AND total_value > 1000
        """
    
    # Guest restriction (should not happen as export requires auth)
    if access_level == "guest":
        conditions.append("LOWER(county) = :guest_county")
        params["guest_county"] = "dallas"
    
    if filters:
        # Price range
        price_range = filters.get("priceRange")
        if price_range:
            if price_range.get("min") is not None:
                conditions.append("total_value >= :price_min")
                params["price_min"] = price_range["min"]
            if price_range.get("max") is not None:
                conditions.append("total_value <= :price_max")
                params["price_max"] = price_range["max"]
        
        # Size range
        size_range = filters.get("sizeRange")
        if size_range:
            if size_range.get("min") is not None:
                conditions.append("sqft >= :size_min")
                params["size_min"] = size_range["min"]
            if size_range.get("max") is not None:
                conditions.append("sqft <= :size_max")
                params["size_max"] = size_range["max"]
        
        # Counties
        counties = filters.get("counties")
        if counties and access_level == "registered":
            lower_counties = [c.lower() for c in counties]
            conditions.append("LOWER(county) = ANY(:counties)")
            params["counties"] = lower_counties
    
    if conditions:
        query += " AND " + " AND ".join(conditions)
    
    # Add ORDER BY clause
    if has_distance and sort_by == "distance":
        query += " ORDER BY distance_miles ASC"
    elif sort_by == "price_asc":
        query += " ORDER BY total_value ASC"
    elif sort_by == "price_desc":
        query += " ORDER BY total_value DESC"
    elif sort_by == "size_asc":
        query += " ORDER BY sqft ASC NULLS LAST"
    elif sort_by == "size_desc":
        query += " ORDER BY sqft DESC NULLS LAST"
    else:
        query += " ORDER BY total_value DESC"
    
    # Limit results
    query += f" LIMIT {settings.max_export_rows}"
    
    return query, params, has_distance


@router.post("/csv")
async def export_csv(
    request: ExportRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(require_auth)
):
    """
    Export filtered property data as CSV.
    
    ST-05: Users export filtered results into a CSV format.
    
    - Requires authentication
    - Maximum 5000 rows per export
    - Returns CSV with UTF-8 BOM for Excel compatibility
    - Only exports properties with valid information (address, price)
    - Supports filtering by location and distance
    - Supports sorting by price, size, or distance
    """
    logger.info(f"CSV export request from user {user_id}")
    
    access_level = get_access_level(user_id)
    
    # Convert filters
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
    
    # Convert center point for distance filtering
    center_point = None
    if request.centerPoint:
        center_point = {
            "longitude": request.centerPoint.longitude,
            "latitude": request.centerPoint.latitude,
            "address": request.centerPoint.address
        }
    
    logger.info(f"Filters: {filters}, CenterPoint: {center_point}, MaxDistance: {request.maxDistance}")
    
    try:
        # Build and execute query
        query, params, has_distance = build_export_query(
            filters=filters,
            access_level=access_level,
            center_point=center_point,
            max_distance=request.maxDistance,
            sort_by=request.sortBy or "price_desc"
        )
        
        result = db.execute(text(query), params)
        
        # Generate CSV content
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
        
        # Write header comment with export info
        writer.writerow(["# DFW Property Search Export"])
        writer.writerow([f"# Export Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"])
        writer.writerow(["#"])
        
        # Write location filter info
        if has_distance and center_point:
            writer.writerow(["# Location Filter:"])
            if center_point.get("address"):
                writer.writerow([f"#   Center: {center_point['address']}"])
            writer.writerow([f"#   Coordinates: ({center_point['latitude']:.6f}, {center_point['longitude']:.6f})"])
            writer.writerow([f"#   Max Distance: {request.maxDistance} miles"])
            writer.writerow(["#"])
        
        writer.writerow(["# Property Filters:"])
        
        if filters:
            # Price range
            price_range = filters.get("priceRange")
            if price_range and (price_range.get("min") is not None or price_range.get("max") is not None):
                price_min = f"${price_range.get('min'):,}" if price_range.get("min") is not None else "No minimum"
                price_max = f"${price_range.get('max'):,}" if price_range.get("max") is not None else "No maximum"
                writer.writerow([f"#   Price Range: {price_min} - {price_max}"])
            
            # Size range
            size_range = filters.get("sizeRange")
            if size_range and (size_range.get("min") is not None or size_range.get("max") is not None):
                size_min = f"{size_range.get('min'):,} sq ft" if size_range.get("min") is not None else "No minimum"
                size_max = f"{size_range.get('max'):,} sq ft" if size_range.get("max") is not None else "No maximum"
                writer.writerow([f"#   Size Range: {size_min} - {size_max}"])
            
            # Counties
            counties = filters.get("counties")
            if counties:
                counties_str = ", ".join(counties)
                writer.writerow([f"#   Counties: {counties_str}"])
            
            # Check if any filter was actually applied
            has_filters = (
                (price_range and (price_range.get("min") is not None or price_range.get("max") is not None)) or
                (size_range and (size_range.get("min") is not None or size_range.get("max") is not None)) or
                counties
            )
            if not has_filters:
                writer.writerow(["#   No property filters applied"])
        else:
            writer.writerow(["#   No property filters applied"])
        
        writer.writerow([f"#   Sorted By: {request.sortBy or 'price_desc'}"])
        writer.writerow(["#"])
        writer.writerow([])  # Empty row for separation
        
        # Write header - include distance column if filtering by location
        if has_distance:
            writer.writerow(CSV_COLUMNS_WITH_DISTANCE)
        else:
            writer.writerow(CSV_COLUMNS)
        
        # Write data rows
        row_count = 0
        for row in result:
            if has_distance:
                distance_str = f"{row.distance_miles:.2f}" if row.distance_miles is not None else ""
                writer.writerow([
                    row.parcel_id,
                    row.address,
                    distance_str,
                    f"${row.price:,.0f}" if row.price else "",
                    f"{row.size_sqft:,.0f}" if row.size_sqft else "",
                    row.county.upper() if row.county else ""
                ])
            else:
                writer.writerow([
                    row.parcel_id,
                    row.address,
                    f"${row.price:,.0f}" if row.price else "",
                    f"{row.size_sqft:,.0f}" if row.size_sqft else "",
                    row.county.upper() if row.county else ""
                ])
            row_count += 1
        
        # Get CSV content with UTF-8 BOM for Excel
        csv_content = output.getvalue()
        csv_bytes = b'\xef\xbb\xbf' + csv_content.encode('utf-8')
        
        # Generate filename with date
        filename = f"properties_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        logger.info(f"User {user_id} exported {row_count} properties (distance filter: {has_distance})")
        
        return StreamingResponse(
            io.BytesIO(csv_bytes),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "X-Total-Rows": str(row_count)
            }
        )
        
    except Exception as e:
        logger.error(f"CSV export error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export data: {str(e)}"
        )

