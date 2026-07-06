import pytest
from fastapi.testclient import TestClient
from main import app, dropout_model

# Initialize the TestClient
client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    # Note: if model is successfully loaded on startup, model_loaded should be true.
    # However, TestClient might not trigger the startup event directly if we don't use 'with TestClient(app)'.
    # But for FastAPI > 0.93.0, `with TestClient(app)` triggers lifecycle events.

def test_health_check_lifecycle():
    with TestClient(app) as client_lifecycle:
        response = client_lifecycle.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["model_loaded"] == True

def test_predict_dropout_valid_average():
    with TestClient(app) as client_lifecycle:
        payload = {
            "student_id": "STU123",
            "attendance_percentage": 75.0,
            "average_internal_marks": 60.0,
            "previous_gpa": 7.0,
            "missed_assessments": 1
        }
        response = client_lifecycle.post("/predict/dropout", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["student_id"] == "STU123"
        assert 0.0 <= data["dropout_risk_score"] <= 1.0
        assert data["risk_level"] in ["low", "medium", "high"]
        assert data["predicted_grade"] in ["A", "B", "C", "F"]
        assert isinstance(data["recommended_interventions"], list)

def test_predict_dropout_high_risk():
    with TestClient(app) as client_lifecycle:
        # Extremely bad performance -> Should be high risk
        payload = {
            "student_id": "STU_BAD",
            "attendance_percentage": 20.0,
            "average_internal_marks": 10.0,
            "previous_gpa": 3.0,
            "missed_assessments": 8
        }
        response = client_lifecycle.post("/predict/dropout", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Based on our synthetic data generation, this should definitely be high risk
        assert data["dropout_risk_score"] > 0.5
        assert data["risk_level"] == "high"
        assert data["predicted_grade"] == "F"
        assert "Send Attendance Warning" in data["recommended_interventions"]
        assert "Schedule Academic Counseling" in data["recommended_interventions"]

def test_predict_dropout_low_risk():
    with TestClient(app) as client_lifecycle:
        # Perfect performance -> Should be low risk
        payload = {
            "student_id": "STU_GOOD",
            "attendance_percentage": 100.0,
            "average_internal_marks": 95.0,
            "previous_gpa": 9.5,
            "missed_assessments": 0
        }
        response = client_lifecycle.post("/predict/dropout", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["dropout_risk_score"] < 0.4
        assert data["risk_level"] == "low"
        assert data["predicted_grade"] in ["A", "B"] # Probably A
        assert data["recommended_interventions"] == ["No action required"]

def test_predict_dropout_missing_gpa():
    with TestClient(app) as client_lifecycle:
        # previous_gpa is optional in Pydantic model
        payload = {
            "student_id": "STU_NEW",
            "attendance_percentage": 85.0,
            "average_internal_marks": 70.0,
            "missed_assessments": 0
        }
        response = client_lifecycle.post("/predict/dropout", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["student_id"] == "STU_NEW"
        # It should successfully impute GPA to 7.5 under the hood and return a valid response
        assert 0.0 <= data["dropout_risk_score"] <= 1.0

def test_predict_dropout_invalid_payload():
    with TestClient(app) as client_lifecycle:
        # Missing required fields like 'attendance_percentage'
        payload = {
            "student_id": "STU_ERR",
            "average_internal_marks": 70.0
        }
        response = client_lifecycle.post("/predict/dropout", json=payload)
        assert response.status_code == 422 # Pydantic validation error

def test_predict_sentiment_mock():
    # Since sentiment is still mock, just test it works
    payload = {
        "feedback_id": "FB_1",
        "text": "This class is great and excellent!"
    }
    response = client.post("/predict/sentiment", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["sentiment"] == "Positive"
    assert data["sentiment_score"] > 0
