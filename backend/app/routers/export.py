"""
Data export API endpoints.
Allows authenticated users to export filtered property data as CSV.
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

# CSV column headers
CSV_COLUMNS = ["Parcel ID", "Address", "Price (USD)", "Size (sq ft)", "County"]


def build_export_query(filters: dict = None, access_level: str = "registered") -> tuple:
    """
    Build SQL query for CSV export.
    
    Args:
        filters: Filter criteria
        access_level: User access level
        
    Returns:
        Tuple of (query_string, params_dict)
    """
    query = """
        SELECT 
            sl_uuid as parcel_id,
            address,
            total_value as price,
            sqft as size_sqft,
            county
        FROM takehome.dallas_parcels
        WHERE 1=1
    """
    
    params = {}
    conditions = []
    
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
    
    # Limit results
    query += f" LIMIT {settings.max_export_rows}"
    
    return query, params


@router.post("/csv")
async def export_csv(
    request: ExportRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(require_auth)
):
    """
    Export filtered property data as CSV.
    
    - Requires authentication
    - Maximum 5000 rows per export
    - Returns CSV with UTF-8 BOM for Excel compatibility
    """
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
    
    try:
        # Build and execute query
        query, params = build_export_query(filters, access_level)
        result = db.execute(text(query), params)
        
        # Generate CSV content
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
        
        # Write filter criteria as comments at the top
        writer.writerow(["# DFW Property Search Export"])
        writer.writerow([f"# Export Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"])
        writer.writerow(["# Applied Filters:"])
        
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
        else:
            writer.writerow(["#   No filters applied"])
        
        writer.writerow(["#"])
        writer.writerow([])  # Empty row for separation
        
        # Write header
        writer.writerow(CSV_COLUMNS)
        
        # Write data rows
        row_count = 0
        for row in result:
            writer.writerow([
                row.parcel_id,
                row.address or "",
                row.price if row.price is not None else "",
                row.size_sqft if row.size_sqft is not None else "",
                row.county or ""
            ])
            row_count += 1
        
        # Get CSV content with UTF-8 BOM for Excel
        csv_content = output.getvalue()
        # Add BOM for Excel compatibility
        csv_bytes = b'\xef\xbb\xbf' + csv_content.encode('utf-8')
        
        # Generate filename with date
        filename = f"properties_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        logger.info(f"User {user_id} exported {row_count} rows")
        
        return StreamingResponse(
            io.BytesIO(csv_bytes),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "X-Total-Rows": str(row_count)
            }
        )
        
    except Exception as e:
        logger.error(f"Error exporting CSV: {e}")
        raise HTTPException(status_code=500, detail="Export failed")

