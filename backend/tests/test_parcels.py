import pytest
from fastapi.testclient import TestClient

def test_health_endpoint(client: TestClient):
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "timestamp" in data

def test_get_parcels_without_filters(client: TestClient):
    """Test getting parcels without filters"""
    response = client.get("/api/v1/parcels")
    assert response.status_code == 200
    data = response.json()
    assert "type" in data
    assert data["type"] == "FeatureCollection"
    assert "features" in data
    assert isinstance(data["features"], list)

def test_get_parcels_with_price_filter(client: TestClient):
    """Test getting parcels with price filter"""
    response = client.get("/api/v1/parcels?min_price=100000&max_price=500000")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    
    # Verify all returned parcels are within price range
    for feature in data["features"]:
        price = feature["properties"]["price"]
        if price is not None:
            assert 100000 <= price <= 500000

def test_get_parcels_with_size_filter(client: TestClient):
    """Test getting parcels with size filter"""
    response = client.get("/api/v1/parcels?min_size=1000&max_size=3000")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    
    # Verify all returned parcels are within size range
    for feature in data["features"]:
        size = feature["properties"]["size_sqft"]
        if size is not None:
            assert 1000 <= size <= 3000

def test_get_parcels_with_county_filter(client: TestClient):
    """Test getting parcels with county filter"""
    response = client.get("/api/v1/parcels?counties=dallas")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    
    # Verify all returned parcels are from Dallas county
    for feature in data["features"]:
        county = feature["properties"]["county"]
        if county:
            assert county.lower() == "dallas"

def test_get_parcels_with_limit(client: TestClient):
    """Test getting parcels with limit"""
    response = client.get("/api/v1/parcels?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) <= 10

def test_get_parcels_with_invalid_price(client: TestClient):
    """Test getting parcels with invalid price"""
    response = client.get("/api/v1/parcels?min_price=-1000")
    # Should return 422 for invalid input (negative price)
    assert response.status_code == 422

def test_get_parcels_with_invalid_size(client: TestClient):
    """Test getting parcels with invalid size"""
    response = client.get("/api/v1/parcels?min_size=-100")
    # Should return 422 for invalid input (negative size)
    assert response.status_code == 422

def test_get_parcels_with_multiple_counties(client: TestClient):
    """Test getting parcels with multiple counties"""
    response = client.get("/api/v1/parcels?counties=dallas&counties=tarrant")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"

def test_get_parcels_with_all_filters(client: TestClient):
    """Test getting parcels with all filters combined"""
    response = client.get(
        "/api/v1/parcels?min_price=100000&max_price=500000"
        "&min_size=1000&max_size=3000&counties=dallas&limit=20"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) <= 20

def test_get_parcels_with_zero_limit(client: TestClient):
    """Test getting parcels with zero limit"""
    response = client.get("/api/v1/parcels?limit=0")
    # Should return 422 for invalid limit (must be >= 1)
    assert response.status_code == 422

def test_get_parcels_response_structure(client: TestClient):
    """Test parcel response structure"""
    response = client.get("/api/v1/parcels?limit=1")
    assert response.status_code == 200
    data = response.json()
    
    if len(data["features"]) > 0:
        feature = data["features"][0]
        assert "type" in feature
        assert feature["type"] == "Feature"
        assert "properties" in feature
        assert "geometry" in feature
        
        # Check required properties
        props = feature["properties"]
        assert "parcel_id" in props
        assert "address" in props
        assert "price" in props
        assert "size_sqft" in props
        assert "county" in props

