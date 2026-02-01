"""
Unit tests for the Preferences API endpoints.
Tests user preference CRUD operations.
"""
import pytest
from fastapi.testclient import TestClient


def test_preferences_requires_auth(client: TestClient):
    """Test that preferences endpoint requires authentication"""
    # GET preferences without auth should return 401
    response = client.get("/api/v1/preferences")
    assert response.status_code == 401
    
    # POST preferences without auth should return 401
    response = client.post("/api/v1/preferences", json={
        "name": "Test Preset",
        "filters": {
            "priceRange": {"min": 100000, "max": 500000},
            "sizeRange": {"min": 1000, "max": 3000},
            "counties": ["Dallas"]
        },
        "isDefault": False
    })
    assert response.status_code == 401


def test_preferences_with_invalid_token(client: TestClient):
    """Test that invalid token is rejected"""
    headers = {"Authorization": "Bearer invalid_token_here"}
    
    response = client.get("/api/v1/preferences", headers=headers)
    assert response.status_code == 401


def test_default_preference_requires_auth(client: TestClient):
    """Test that default preference endpoint requires auth"""
    response = client.get("/api/v1/preferences/default")
    assert response.status_code == 401


def test_delete_preference_requires_auth(client: TestClient):
    """Test that delete preference requires auth"""
    response = client.delete("/api/v1/preferences/some-id")
    assert response.status_code == 401


def test_update_preference_requires_auth(client: TestClient):
    """Test that update preference requires auth"""
    response = client.put("/api/v1/preferences/some-id", json={
        "name": "Updated Name"
    })
    assert response.status_code == 401


# Note: Tests with valid authentication would require mocking AWS Cognito
# or setting up a test user pool. For full integration testing, consider:
#
# 1. Using pytest-mock to mock the auth.verify_token function
# 2. Creating a test Cognito user pool
# 3. Using localstack for local AWS service emulation
#
# Example with mocking (not run in CI due to complexity):
#
# @pytest.fixture
# def mock_auth(mocker):
#     mocker.patch('app.auth.verify_token', return_value={'sub': 'test-user-id'})
#
# def test_create_preference_with_auth(client: TestClient, mock_auth):
#     response = client.post(
#         "/api/v1/preferences",
#         json={"name": "Test", "filters": {}, "isDefault": False},
#         headers={"Authorization": "Bearer mock_token"}
#     )
#     assert response.status_code == 201

