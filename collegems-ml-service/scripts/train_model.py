import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score
import joblib
import os

# Create necessary directories
os.makedirs("models", exist_ok=True)
os.makedirs("data", exist_ok=True)

def generate_mock_data(n_samples=5000):
    """
    Generates a synthetic dataset for student dropout risk prediction.
    Features: attendance_percentage, average_internal_marks, previous_gpa, missed_assessments
    Target: dropout (1 for high risk, 0 for low risk)
    """
    np.random.seed(42)
    
    # Generate features
    attendance = np.random.normal(loc=80, scale=15, size=n_samples)
    attendance = np.clip(attendance, 10, 100)
    
    internal_marks = np.random.normal(loc=65, scale=20, size=n_samples)
    internal_marks = np.clip(internal_marks, 0, 100)
    
    gpa = np.random.normal(loc=7.5, scale=1.5, size=n_samples)
    gpa = np.clip(gpa, 2.0, 10.0)
    
    missed = np.random.poisson(lam=1, size=n_samples)
    missed = np.clip(missed, 0, 10)
    
    # Generate target based on heuristics (to simulate real patterns)
    # The lower the performance, the higher the risk.
    risk_score = (100 - attendance) * 0.4 + (100 - internal_marks) * 0.3 + (10 - gpa)*10 * 0.2 + (missed * 10) * 0.1
    
    # Add noise to make it realistic
    risk_score += np.random.normal(loc=0, scale=10, size=n_samples)
    
    # Threshold for dropout
    dropout = (risk_score > 40).astype(int)
    
    df = pd.DataFrame({
        'attendance_percentage': attendance,
        'average_internal_marks': internal_marks,
        'previous_gpa': gpa,
        'missed_assessments': missed,
        'dropout': dropout
    })
    
    df.to_csv("data/student_data.csv", index=False)
    print(f"Generated {n_samples} synthetic student records.")
    return df

def train_pipeline():
    print("Starting ML pipeline...")
    
    # 1. Load data
    if not os.path.exists("data/student_data.csv"):
        df = generate_mock_data()
    else:
        df = pd.read_csv("data/student_data.csv")
        
    X = df[['attendance_percentage', 'average_internal_marks', 'previous_gpa', 'missed_assessments']]
    y = df['dropout']
    
    # 2. Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # 3. Train model
    print("Training Random Forest Classifier...")
    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)
    
    # 4. Evaluate
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]
    
    print("\n--- Model Evaluation ---")
    print(classification_report(y_test, y_pred))
    roc_auc = roc_auc_score(y_test, y_proba)
    print(f"ROC-AUC Score: {roc_auc:.4f}")
    
    # Print feature importances
    importances = model.feature_importances_
    for name, imp in zip(X.columns, importances):
        print(f"Feature '{name}': {imp:.4f}")
    
    # 5. Save model
    model_path = "models/dropout_model_v1.joblib"
    joblib.dump(model, model_path)
    print(f"\nModel saved successfully to {model_path}")

if __name__ == "__main__":
    train_pipeline()
