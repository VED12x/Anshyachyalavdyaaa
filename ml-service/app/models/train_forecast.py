import os
import json
import time
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense

def generate_data(num_samples=1000, seq_len=12, pred_len=6):
    X = np.zeros((num_samples, seq_len, 1))
    y = np.zeros((num_samples, pred_len))
    
    for i in range(num_samples):
        start = np.random.uniform(80, 150)
        trend = np.random.uniform(-2, 2)
        noise_x = np.random.normal(0, 2, seq_len)
        noise_y = np.random.normal(0, 2, pred_len)
        
        x_vals = start + trend * np.arange(seq_len) + noise_x
        y_vals = start + trend * np.arange(seq_len, seq_len + pred_len) + noise_y
        
        X[i, :, 0] = x_vals
        y[i, :] = y_vals
        
    return X, y

def train():
    print("Generating synthetic data for forecasting...")
    X, y = generate_data()
    
    print("Building LSTM model...")
    model = Sequential([
        LSTM(32, activation='relu', input_shape=(12, 1)),
        Dense(16, activation='relu'),
        Dense(6)
    ])
    
    model.compile(optimizer='adam', loss='mse', metrics=['mae'])
    
    print("Training model...")
    model.fit(X, y, epochs=5, batch_size=32, validation_split=0.2)
    
    models_dir = os.path.dirname(__file__)
    timestamp = int(time.time())
    model_path = os.path.join(models_dir, f"forecast_lstm_{timestamp}.h5")
    model.save(model_path)
    
    meta = {
        "version": f"lstm_v{timestamp}",
        "metrics": {"val_mae": float(model.history.history['val_mae'][-1])}
    }
    with open(os.path.join(models_dir, f"forecast_lstm_{timestamp}_meta.json"), "w") as f:
        json.dump(meta, f)
        
    print(f"Model saved to {model_path}")
    print(f"Validation MAE: {meta['metrics']['val_mae']}")

if __name__ == "__main__":
    train()
