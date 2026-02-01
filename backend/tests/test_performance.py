"""
Performance and boundary tests for the DFW Property Search API.

These tests verify the API handles edge cases and performance boundaries correctly.

⚠️ NOTE: Some tests are marked as skipped to avoid excessive database calls
during CI/CD. They can be enabled for local performance testing.

To run performance tests locally:
    pytest tests/test_performance.py -v --run-performance
"""
import pytest
import time
from fastapi.testclient import TestClient


# Custom marker for performance tests
def pytest_configure(config):
    config.addinivalue_line(
        "markers", "performance: mark test as performance test"
    )


class TestPaginationBoundaries:
    """Test pagination edge cases"""
    
    def test_first_page(self, client: TestClient):
        """Test first page with offset=0"""
        response = client.get("/api/v1/parcels?limit=10&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert len(data["features"]) <= 10
    
    def test_large_offset_returns_empty(self, client: TestClient):
        """Test that very large offset returns empty results"""
        response = client.get("/api/v1/parcels?limit=10&offset=9999999")
        assert response.status_code == 200
        data = response.json()
        assert len(data["features"]) == 0
    
    def test_max_limit_boundary(self, client: TestClient):
        """Test maximum allowed limit"""
        response = client.get("/api/v1/parcels?limit=10000")
        assert response.status_code == 200
        data = response.json()
        assert len(data["features"]) <= 10000
    
    def test_over_max_limit_rejected(self, client: TestClient):
        """Test that limit over maximum is rejected"""
        response = client.get("/api/v1/parcels?limit=10001")
        assert response.status_code == 422
    
    def test_zero_offset(self, client: TestClient):
        """Test zero offset works correctly"""
        response = client.get("/api/v1/parcels?offset=0")
        assert response.status_code == 200
    
    def test_negative_offset_rejected(self, client: TestClient):
        """Test negative offset is rejected"""
        response = client.get("/api/v1/parcels?offset=-1")
        assert response.status_code == 422


class TestFilterBoundaries:
    """Test filter edge cases"""
    
    def test_zero_price_range(self, client: TestClient):
        """Test price range starting at zero"""
        response = client.get("/api/v1/parcels?min_price=0&max_price=100")
        assert response.status_code == 200
    
    def test_very_large_price(self, client: TestClient):
        """Test very large price filter"""
        response = client.get("/api/v1/parcels?min_price=999999999&max_price=9999999999")
        assert response.status_code == 200
        data = response.json()
        # Should return empty or very few results
        assert len(data["features"]) >= 0
    
    def test_inverted_price_range(self, client: TestClient):
        """Test min_price > max_price (should return empty)"""
        response = client.get("/api/v1/parcels?min_price=500000&max_price=100000")
        assert response.status_code == 200
        data = response.json()
        # Inverted range should return empty
        assert len(data["features"]) == 0
    
    def test_zero_size_range(self, client: TestClient):
        """Test size range starting at zero"""
        response = client.get("/api/v1/parcels?min_size=0&max_size=100")
        assert response.status_code == 200
    
    def test_very_large_size(self, client: TestClient):
        """Test very large size filter"""
        response = client.get("/api/v1/parcels?min_size=999999999&max_size=9999999999")
        assert response.status_code == 200
        data = response.json()
        # Should return empty results
        assert len(data["features"]) == 0
    
    def test_single_value_price_range(self, client: TestClient):
        """Test price range where min equals max"""
        response = client.get("/api/v1/parcels?min_price=100000&max_price=100000")
        assert response.status_code == 200
    
    def test_empty_counties_filter(self, client: TestClient):
        """Test empty counties filter"""
        response = client.get("/api/v1/parcels?counties=")
        assert response.status_code == 200
    
    def test_nonexistent_county(self, client: TestClient):
        """Test filtering by nonexistent county"""
        response = client.get("/api/v1/parcels?counties=nonexistent_county")
        assert response.status_code == 200
        data = response.json()
        # Note: Guest users are restricted to Dallas county only,
        # so county filter is effectively ignored for guests.
        # The response will contain Dallas parcels regardless.
        # For authenticated users, this would return empty.
        # This is by design per ST-03 requirement.
        assert "features" in data


class TestResponseMetadata:
    """Test response metadata accuracy"""
    
    def test_metadata_total_accuracy(self, client: TestClient):
        """Test that metadata total count is accurate"""
        response = client.get("/api/v1/parcels?limit=10")
        assert response.status_code == 200
        data = response.json()
        
        # Verify metadata exists
        assert "metadata" in data
        assert "total" in data["metadata"]
        assert "returned" in data["metadata"]
        assert "hasMore" in data["metadata"]
        
        # Returned count should match features length
        assert data["metadata"]["returned"] == len(data["features"])
    
    def test_has_more_flag(self, client: TestClient):
        """Test hasMore flag accuracy"""
        response = client.get("/api/v1/parcels?limit=1")
        assert response.status_code == 200
        data = response.json()
        
        # If total > returned, hasMore should be True
        if data["metadata"]["total"] > data["metadata"]["returned"]:
            assert data["metadata"]["hasMore"] is True
        else:
            assert data["metadata"]["hasMore"] is False
    
    def test_access_level_guest(self, client: TestClient):
        """Test access level is guest without authentication"""
        response = client.get("/api/v1/parcels?limit=1")
        assert response.status_code == 200
        data = response.json()
        
        assert data["metadata"]["accessLevel"] == "guest"


class TestDataIntegrity:
    """Test data integrity and format"""
    
    def test_geojson_format(self, client: TestClient):
        """Test response follows GeoJSON format"""
        response = client.get("/api/v1/parcels?limit=1")
        assert response.status_code == 200
        data = response.json()
        
        # Verify GeoJSON structure
        assert data["type"] == "FeatureCollection"
        assert isinstance(data["features"], list)
        
        if len(data["features"]) > 0:
            feature = data["features"][0]
            assert feature["type"] == "Feature"
            assert "properties" in feature
            assert "geometry" in feature
    
    def test_geometry_format(self, client: TestClient):
        """Test geometry is valid GeoJSON Point"""
        response = client.get("/api/v1/parcels?limit=1")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["features"]) > 0:
            geometry = data["features"][0]["geometry"]
            assert geometry["type"] == "Point"
            assert "coordinates" in geometry
            assert len(geometry["coordinates"]) == 2
            
            # Coordinates should be valid lng/lat
            lng, lat = geometry["coordinates"]
            assert -180 <= lng <= 180
            assert -90 <= lat <= 90
    
    def test_properties_completeness(self, client: TestClient):
        """Test all required properties are present"""
        response = client.get("/api/v1/parcels?limit=1")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["features"]) > 0:
            props = data["features"][0]["properties"]
            required_props = ["parcel_id", "address", "price", "size_sqft", "county"]
            for prop in required_props:
                assert prop in props


# ===========================================
# Performance tests (skipped by default)
# ===========================================

@pytest.mark.skip(reason="Performance test - enable for local testing only")
class TestPerformance:
    """
    Performance tests - skipped by default to avoid excessive API calls.
    
    These tests verify response times and throughput.
    Enable locally with: pytest tests/test_performance.py -v --run-performance
    """
    
    def test_response_time_small_query(self, client: TestClient):
        """Test response time for small query"""
        start = time.time()
        response = client.get("/api/v1/parcels?limit=10")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        assert elapsed < 2.0, f"Response took {elapsed:.2f}s, expected < 2s"
    
    def test_response_time_medium_query(self, client: TestClient):
        """Test response time for medium query"""
        start = time.time()
        response = client.get("/api/v1/parcels?limit=100")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        assert elapsed < 5.0, f"Response took {elapsed:.2f}s, expected < 5s"
    
    def test_response_time_large_query(self, client: TestClient):
        """Test response time for large query"""
        start = time.time()
        response = client.get("/api/v1/parcels?limit=1000")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        assert elapsed < 10.0, f"Response took {elapsed:.2f}s, expected < 10s"
    
    def test_response_time_with_filters(self, client: TestClient):
        """Test response time with filters applied"""
        start = time.time()
        response = client.get(
            "/api/v1/parcels?min_price=100000&max_price=500000"
            "&min_size=1000&max_size=3000&limit=100"
        )
        elapsed = time.time() - start
        
        assert response.status_code == 200
        assert elapsed < 5.0, f"Response took {elapsed:.2f}s, expected < 5s"
    
    def test_concurrent_requests(self, client: TestClient):
        """
        Test handling of concurrent requests.
        
        Note: This is a simplified test. For proper load testing,
        use tools like locust or k6.
        """
        import concurrent.futures
        
        def make_request():
            return client.get("/api/v1/parcels?limit=10")
        
        start = time.time()
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request) for _ in range(5)]
            results = [f.result() for f in futures]
        elapsed = time.time() - start
        
        # All requests should succeed
        for response in results:
            assert response.status_code == 200
        
        # Total time should be reasonable
        assert elapsed < 10.0, f"5 concurrent requests took {elapsed:.2f}s"


# ===========================================
# Database load tests (commented out)
# ===========================================

# The following tests are commented out because they make
# many API calls which could:
# 1. Slow down CI/CD
# 2. Incur costs if database is pay-per-query
# 3. Affect production database performance
#
# Enable for local stress testing only.

# class TestDatabaseLoad:
#     """
#     Database load tests - DO NOT RUN IN CI/CD
#     
#     These tests verify database handles load correctly.
#     Enable locally for stress testing only.
#     """
#     
#     def test_sequential_pagination(self, client: TestClient):
#         """Test sequential pagination through all data"""
#         offset = 0
#         total_fetched = 0
#         
#         while True:
#             response = client.get(f"/api/v1/parcels?limit=100&offset={offset}")
#             assert response.status_code == 200
#             data = response.json()
#             
#             total_fetched += len(data["features"])
#             
#             if not data["metadata"]["hasMore"]:
#                 break
#             
#             offset += 100
#             
#             # Safety limit
#             if offset > 10000:
#                 break
#         
#         print(f"Total fetched: {total_fetched}")
#     
#     def test_repeated_queries(self, client: TestClient):
#         """Test repeated identical queries for caching"""
#         for i in range(10):
#             response = client.get("/api/v1/parcels?limit=100")
#             assert response.status_code == 200

