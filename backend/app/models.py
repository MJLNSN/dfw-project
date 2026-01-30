"""
SQLAlchemy models for database tables.
Note: dallas_parcels table is read-only (takehome user has only read permissions).
"""
from sqlalchemy import Column, String, Float, Integer
from geoalchemy2 import Geometry
from .database import Base


class DallasParcel(Base):
    """
    Model representing the dallas_parcels table.
    
    Important field mappings:
    - sl_uuid -> parcel_id
    - total_value -> price
    - sqft -> size_sqft
    """
    __tablename__ = "dallas_parcels"
    __table_args__ = {"schema": "takehome"}
    
    sl_uuid = Column(String, primary_key=True, comment="Parcel ID")
    address = Column(String, comment="Property address")
    total_value = Column(Float, comment="Total property value (price)")
    sqft = Column(Float, comment="Size in square feet")
    county = Column(String, comment="County name")
    geom = Column(Geometry("GEOMETRY", srid=4326), comment="Geographic location")
    
    def to_dict(self):
        """Convert model to dictionary with mapped field names."""
        return {
            "parcel_id": self.sl_uuid,
            "address": self.address,
            "price": self.total_value,
            "size_sqft": self.sqft,
            "county": self.county
        }
    
    def to_geojson_feature(self):
        """Convert to GeoJSON feature format."""
        return {
            "type": "Feature",
            "properties": self.to_dict(),
            "geometry": None  # Will be populated from query
        }

