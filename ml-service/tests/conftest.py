import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def flat_glucose_history():
    return [{"value": 100.0, "timestamp": f"T{i}"} for i in range(12)]

@pytest.fixture
def rising_glucose_history():
    return [{"value": 100.0 + (i*5), "timestamp": f"T{i}"} for i in range(12)]

@pytest.fixture
def falling_glucose_history():
    return [{"value": 100.0 - (i*3), "timestamp": f"T{i}"} for i in range(12)]
