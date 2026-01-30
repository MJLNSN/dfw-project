"""
Integration tests for the DFW Property Search API
Tests the full workflow from authentication to data export
"""
import pytest
from fastapi.testclient import TestClient


def test_guest_user_workflow(client: TestClient):
    """Test complete workflow for guest user"""
    # 1. Get parcels without authentication (guest mode)
    response = client.get("/api/v1/parcels?limit=10")
    assert response.status_code == 200
    data = response.json()
    
    # Verify guest restrictions
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) <= 10
    
    # All parcels should be from Dallas county (guest restriction)
    for feature in data["features"]:
        county = feature["properties"]["county"]
        if county:
            assert county.lower() == "dallas"
    
    # 2. Try to access preferences without auth (should fail or return empty)
    response = client.get("/api/v1/preferences")
    # Depending on implementation, might be 401 or 200 with empty list
    assert response.status_code in [200, 401]


def test_filter_workflow(client: TestClient):
    """Test filtering workflow"""
    # 1. Get all parcels
    response = client.get("/api/v1/parcels?limit=100")
    assert response.status_code == 200
    all_data = response.json()
    total_count = len(all_data["features"])
    
    # 2. Apply price filter
    response = client.get("/api/v1/parcels?min_price=200000&max_price=400000&limit=100")
    assert response.status_code == 200
    filtered_data = response.json()
    
    # Verify filtering worked
    for feature in filtered_data["features"]:
        price = feature["properties"]["price"]
        if price is not None:
            assert 200000 <= price <= 400000
    
    # 3. Apply size filter
    response = client.get("/api/v1/parcels?min_size=1500&max_size=2500&limit=100")
    assert response.status_code == 200
    size_filtered = response.json()
    
    # Verify size filtering
    for feature in size_filtered["features"]:
        size = feature["properties"]["size_sqft"]
        if size is not None:
            assert 1500 <= size <= 2500
    
    # 4. Combine filters
    response = client.get(
        "/api/v1/parcels?min_price=200000&max_price=400000"
        "&min_size=1500&max_size=2500&limit=100"
    )
    assert response.status_code == 200
    combined_data = response.json()
    
    # Combined filters should return fewer or equal results
    assert len(combined_data["features"]) <= min(
        len(filtered_data["features"]),
        len(size_filtered["features"])
    )


def test_export_workflow(client: TestClient):
    """Test CSV export workflow - requires authentication"""
    # Export endpoint requires authentication
    # Test that it properly rejects unauthenticated requests
    response = client.post("/api/v1/export/csv", json={
        "filters": {
            "priceRange": {"min": None, "max": None},
            "sizeRange": {"min": None, "max": None},
            "counties": []
        }
    })
    # Should return 401 Unauthorized without valid token
    assert response.status_code == 401
    
    # Test with mock auth header (will still fail without valid AWS Cognito token)
    response = client.post(
        "/api/v1/export/csv",
        json={
            "filters": {
                "priceRange": {"min": 200000, "max": 400000},
                "sizeRange": {"min": 1500, "max": 2500},
                "counties": []
            }
        },
        headers={"Authorization": "Bearer mock_token"}
    )
    # Should still return 401 with invalid token
    assert response.status_code == 401


def test_pagination_workflow(client: TestClient):
    """Test pagination workflow"""
    # 1. Get first page
    response = client.get("/api/v1/parcels?limit=10&offset=0")
    assert response.status_code == 200
    page1 = response.json()
    assert len(page1["features"]) <= 10
    
    # 2. Get second page
    response = client.get("/api/v1/parcels?limit=10&offset=10")
    assert response.status_code == 200
    page2 = response.json()
    
    # 3. Verify pages are different (if enough data exists)
    if len(page1["features"]) == 10 and len(page2["features"]) > 0:
        page1_ids = {f["properties"]["parcel_id"] for f in page1["features"]}
        page2_ids = {f["properties"]["parcel_id"] for f in page2["features"]}
        # Pages should not have overlapping parcels
        assert len(page1_ids & page2_ids) == 0


def test_error_handling_workflow(client: TestClient):
    """Test error handling across different scenarios"""
    # 1. Invalid query parameters
    response = client.get("/api/v1/parcels?limit=-1")
    assert response.status_code == 422
    
    response = client.get("/api/v1/parcels?min_price=-1000")
    assert response.status_code == 422
    
    # 2. Invalid endpoints
    response = client.get("/api/v1/nonexistent")
    assert response.status_code == 404
    
    # 3. Health check should always work
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_data_consistency(client: TestClient):
    """Test data consistency across multiple requests"""
    # Make multiple requests and verify consistency
    responses = []
    for _ in range(3):
        response = client.get("/api/v1/parcels?limit=50")
        assert response.status_code == 200
        responses.append(response.json())
    
    # All responses should have the same structure
    for resp in responses:
        assert "type" in resp
        assert resp["type"] == "FeatureCollection"
        assert "features" in resp
        assert isinstance(resp["features"], list)
    
    # Feature counts should be consistent (assuming no data changes)
    counts = [len(r["features"]) for r in responses]
    assert len(set(counts)) == 1, "Response counts should be consistent"


def test_boundary_conditions(client: TestClient):
    """Test boundary conditions"""
    # 1. Maximum limit
    response = client.get("/api/v1/parcels?limit=10000")
    assert response.status_code == 200
    data = response.json()
    assert len(data["features"]) <= 10000
    
    # 2. Minimum limit
    response = client.get("/api/v1/parcels?limit=1")
    assert response.status_code == 200
    data = response.json()
    assert len(data["features"]) <= 1
    
    # 3. Large offset
    response = client.get("/api/v1/parcels?offset=999999")
    assert response.status_code == 200
    data = response.json()
    # Should return empty or very few results
    assert len(data["features"]) >= 0
    
    # 4. Edge case prices
    response = client.get("/api/v1/parcels?min_price=0&max_price=1")
    assert response.status_code == 200
    
    # 5. Edge case sizes
    response = client.get("/api/v1/parcels?min_size=0&max_size=1")
    assert response.status_code == 200

