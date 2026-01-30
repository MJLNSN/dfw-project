import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    """Create a test client"""
    return TestClient(app)

@pytest.fixture
def mock_auth_headers():
    """Mock authentication headers"""
    return {
        "Authorization": "Bearer mock_token"
    }

@pytest.fixture
def sample_filters():
    """Sample filter data for testing"""
    return {
        "priceRange": {"min": 100000, "max": 500000},
        "sizeRange": {"min": 1000, "max": 3000},
        "counties": ["dallas"]
    }

@pytest.fixture
def sample_preference():
    """Sample preference data for testing"""
    return {
        "name": "Test Preference",
        "filters": {
            "priceRange": {"min": 100000, "max": 500000},
            "sizeRange": {"min": 1000, "max": 3000},
            "counties": ["dallas"]
        },
        "isDefault": False
    }

