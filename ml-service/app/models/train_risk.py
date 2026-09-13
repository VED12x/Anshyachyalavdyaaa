import os
import json
import time
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix
import joblib

def generate_data(num_samples=1000):
    # Features: [last_glucose, trend, variability, meal_carbs, time_since_meal]
    X = np.zeros((num_samples, 5))
    y = np.zeros(num_samples, dtype=int)
    
    for i in range(num_samples):
        last_g = np.random.uniform(50, 250)
        trend = np.random.uniform(-5, 5)
        var = np.random.uniform(0, 20)
        carbs = np.random.uniform(0, 100)
        tsm = np.random.uniform(0, 300)
        
        X[i] = [last_g, trend, var, carbs, tsm]
        
        if last_g < 70 or (last_g < 90 and trend < -2):
            y[i] = 1 # Hypo
        elif last_g > 180 or (last_g > 140 and trend > 2 and carbs > 50):
            y[i] = 2 # Hyper
        else:
            y[i] = 0 # Normal
            
    return X, y

def train():
    print("Generating synthetic data for risk prediction...")
    X, y = generate_data()
    
    print("Training RandomForest model...")
    model = RandomForestClassifier(n_estimators=50, max_depth=5)
    model.fit(X, y)
    
    preds = model.predict(X)
    acc = accuracy_score(y, preds)
    cm = confusion_matrix(y, preds)
    
    print(f"Accuracy: {acc}")
    print(f"Confusion Matrix:\n{cm}")
    
    models_dir = os.path.dirname(__file__)
    timestamp = int(time.time())
    model_path = os.path.join(models_dir, f"risk_rf_{timestamp}.joblib")
    joblib.dump(model, model_path)
    
    meta = {
        "version": f"rf_v{timestamp}",
        "metrics": {"accuracy": acc}
    }
    with open(os.path.join(models_dir, f"risk_rf_{timestamp}_meta.json"), "w") as f:
        json.dump(meta, f)
        
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    train()
