from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import random
import logging
import joblib
import numpy as np
import os

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - [%(correlation_id)s] - %(message)s')
logger = logging.getLogger("ml_service")

app = FastAPI(
    title="CollegeMS AI Analytics API",
    description="Provides machine learning predictions for student dropout risk and performance forecasting.",
    version="1.0.0"
)

# Global variables for models
dropout_model = None
# Assume columns: attendance_percentage, average_internal_marks, previous_gpa, missed_assessments
FEATURE_NAMES = ['attendance_percentage', 'average_internal_marks', 'previous_gpa', 'missed_assessments']

@app.on_event("startup")
async def load_models():
    global dropout_model
    model_path = os.path.join("models", "dropout_model_v1.joblib")
    try:
        if os.path.exists(model_path):
            dropout_model = joblib.load(model_path)
            logger.info(f"Successfully loaded dropout model from {model_path}")
        else:
            logger.warning(f"Model file not found at {model_path}. Inference will fail.")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")

class StudentData(BaseModel):
    student_id: str
    attendance_percentage: float
    average_internal_marks: float
    previous_gpa: float | None = None
    missed_assessments: int

class PredictionResponse(BaseModel):
    student_id: str
    dropout_risk_score: float
    risk_level: str
    predicted_grade: str
    recommended_interventions: list[str]

def get_risk_level(score: float) -> str:
    if score > 0.6:
        return "high"
    elif score > 0.3:
        return "medium"
    return "low"

def generate_dynamic_interventions(data: StudentData, risk_score: float, risk_level: str) -> list[str]:
    interventions = []
    
    # If the risk is low, no interventions needed
    if risk_level == "low":
        return ["No action required"]

    # We use basic heuristics mapped to the model's feature space to recommend interventions
    # In a more advanced setup, we would extract SHAP values for the specific prediction
    if data.attendance_percentage < 75.0:
        interventions.append("Send Attendance Warning")
    
    if data.average_internal_marks < 50.0:
        interventions.append("Schedule Academic Counseling")
        
    if data.previous_gpa and data.previous_gpa < 6.0:
        interventions.append("Assign Academic Tutor")
        
    if data.missed_assessments > 1:
        interventions.append("Investigate Missed Assessments")
        
    if risk_level == "high":
        interventions.append("Assign Mentor for 1-on-1 Session")
        interventions.append("Notify Parent/Guardian")
    
    # Deduplicate and limit
    interventions = list(dict.fromkeys(interventions))
    if not interventions:
        interventions.append("Monitor student progress closely")
        
    return interventions

@app.post("/predict/dropout", response_model=PredictionResponse)
async def predict_dropout(data: StudentData, request: Request):
    correlation_id = request.headers.get("x-correlation-id", "N/A")
    log_adapter = logging.LoggerAdapter(logger, {"correlation_id": correlation_id})
    log_adapter.info(f"Received prediction request for student {data.student_id}")
    
    if dropout_model is None:
        raise HTTPException(status_code=503, detail="ML Model is not loaded. Try again later.")
        
    try:
        # Impute GPA if missing (e.g., first semester student)
        gpa = data.previous_gpa if data.previous_gpa is not None else 7.5
        
        # 1. Prepare features array
        features = np.array([[
            data.attendance_percentage,
            data.average_internal_marks,
            gpa,
            data.missed_assessments
        ]])
        
        # 2. Run real ML inference (predict_proba returns array of [[prob_0, prob_1]])
        risk_score = float(dropout_model.predict_proba(features)[0][1])
        risk_level = get_risk_level(risk_score)
        
        # 3. Forecast grade (Heuristics based on risk + features)
        predicted_grade = "B"
        if risk_level == "high":
            predicted_grade = "F"
        elif risk_level == "medium":
            predicted_grade = "C"
        elif data.average_internal_marks > 80 and gpa >= 8.0:
            predicted_grade = "A"
            
        # 4. Generate Interventions
        interventions = generate_dynamic_interventions(data, risk_score, risk_level)
        
        log_adapter.info(f"Generated ML prediction for student {data.student_id} - Risk: {risk_level} ({risk_score:.2f}), Grade: {predicted_grade}")
        
        return PredictionResponse(
            student_id=data.student_id,
            dropout_risk_score=round(risk_score, 2),
            risk_level=risk_level,
            predicted_grade=predicted_grade,
            recommended_interventions=interventions
        )
    except Exception as e:
        log_adapter.error(f"Error predicting dropout for student {data.student_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
# Sentiment Analysis Mock (Out of Scope for this specific issue)
# ---------------------------------------------------------

class SentimentRequest(BaseModel):
    feedback_id: str
    text: str

class SentimentResponse(BaseModel):
    feedback_id: str
    sentiment: str
    sentiment_score: float

def mock_predict_sentiment(text: str) -> tuple[str, float]:
    text_lower = text.lower()
    positive_words = ['good', 'great', 'excellent', 'awesome', 'helpful', 'love', 'best', 'amazing', 'clear']
    negative_words = ['bad', 'terrible', 'worst', 'unhelpful', 'hate', 'awful', 'confusing', 'poor', 'hard']
    
    pos_count = sum(1 for word in positive_words if word in text_lower)
    neg_count = sum(1 for word in negative_words if word in text_lower)
    
    score = (pos_count - neg_count) * 0.3
    score += random.uniform(-0.1, 0.1)
    score = max(-1.0, min(1.0, score))
    
    if score > 0.1:
        sentiment = "Positive"
    elif score < -0.1:
        sentiment = "Negative"
    else:
        sentiment = "Neutral"
        
    return sentiment, score

@app.post("/predict/sentiment", response_model=SentimentResponse)
async def predict_sentiment(data: SentimentRequest, request: Request):
    correlation_id = request.headers.get("x-correlation-id", "N/A")
    log_adapter = logging.LoggerAdapter(logger, {"correlation_id": correlation_id})
    
    try:
        sentiment, score = mock_predict_sentiment(data.text)
        return SentimentResponse(
            feedback_id=data.feedback_id,
            sentiment=sentiment,
            sentiment_score=round(score, 2)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "CollegeMS ML Analytics", "model_loaded": dropout_model is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
