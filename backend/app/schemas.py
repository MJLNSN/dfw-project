"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime


# ============================================
# Filter Schemas
# ============================================

class PriceRange(BaseModel):
    """Price range filter."""
    min: Optional[float] = Field(None, ge=0, description="Minimum price in USD")
    max: Optional[float] = Field(None, ge=0, description="Maximum price in USD")
    
    @field_validator('max')
    @classmethod
    def validate_max(cls, v, info):
        """Ensure max is greater than min if both are provided."""
        if v is not None and info.data.get('min') is not None:
            if v < info.data['min']:
                # Swap values if max < min
                return info.data['min']
        return v


class SizeRange(BaseModel):
    """Size range filter in square feet."""
    min: Optional[float] = Field(None, ge=0, description="Minimum size in sq ft")
    max: Optional[float] = Field(None, ge=0, description="Maximum size in sq ft")
    
    @field_validator('max')
    @classmethod
    def validate_max(cls, v, info):
        """Ensure max is greater than min if both are provided."""
        if v is not None and info.data.get('min') is not None:
            if v < info.data['min']:
                return info.data['min']
        return v


class FilterCriteria(BaseModel):
    """Complete filter criteria for property search."""
    priceRange: Optional[PriceRange] = None
    sizeRange: Optional[SizeRange] = None
    counties: Optional[List[str]] = None


# ============================================
# Request Schemas
# ============================================

class SearchRequest(BaseModel):
    """Request body for property search."""
    filters: Optional[FilterCriteria] = None
    bbox: Optional[str] = Field(None, description="Bounding box: minLng,minLat,maxLng,maxLat")
    limit: int = Field(1000, ge=1, le=10000, description="Maximum results to return")
    offset: int = Field(0, ge=0, description="Offset for pagination")


class ExportRequest(BaseModel):
    """Request body for CSV export."""
    filters: Optional[FilterCriteria] = None


class PreferenceCreate(BaseModel):
    """Schema for creating a new preference."""
    name: str = Field(..., min_length=1, max_length=100, description="Preference name")
    filters: FilterCriteria
    isDefault: bool = Field(False, description="Set as default preference")


class PreferenceUpdate(BaseModel):
    """Schema for updating a preference."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    filters: Optional[FilterCriteria] = None
    isDefault: Optional[bool] = None


# ============================================
# Response Schemas
# ============================================

class ParcelProperties(BaseModel):
    """Properties of a parcel."""
    parcel_id: str
    address: Optional[str] = None
    price: Optional[float] = None
    size_sqft: Optional[float] = None
    county: Optional[str] = None


class GeoJSONFeature(BaseModel):
    """GeoJSON Feature representation."""
    type: str = "Feature"
    properties: ParcelProperties
    geometry: Optional[Dict[str, Any]] = None


class MetadataResponse(BaseModel):
    """Metadata for paginated responses."""
    total: int
    returned: int
    hasMore: bool
    accessLevel: str


class FeatureCollectionResponse(BaseModel):
    """GeoJSON FeatureCollection response."""
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]
    metadata: MetadataResponse


class PreferenceResponse(BaseModel):
    """Response for a single preference."""
    id: str
    name: str
    filters: FilterCriteria
    isDefault: bool
    created_at: str
    updated_at: str


class PreferencesListResponse(BaseModel):
    """Response for listing preferences."""
    data: List[PreferenceResponse]


class ErrorDetail(BaseModel):
    """Error detail information."""
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: ErrorDetail
    metadata: Dict[str, Any]


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    timestamp: str
    database: str

