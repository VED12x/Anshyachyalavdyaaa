import os
import glob
import numpy as np
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import joblib

router = APIRouter(prefix="/predict", tags=["predict"])

class ForecastRequest(BaseModel):
    glucose_history: List[Dict[str, Any]]
    recent_meals: Optional[List[Dict[str, Any]]] = None
    recent_activity: Optional[List[Dict[str, Any]]] = None

class ForecastPoint(BaseModel):
    t: str
    actual: Optional[float]
    predicted: float
    low: float
    high: float

class ForecastResponse(BaseModel):
    forecast: List[ForecastPoint]
    model_version: str

class RiskRequest(BaseModel):
    glucose_history: List[Dict[str, Any]]
    recent_meals: Optional[List[Dict[str, Any]]] = None
    medications: Optional[List[Dict[str, Any]]] = None

class RiskResponse(BaseModel):
    hypo_risk: float
    hyper_risk: float
    event_type: Optional[str] = None
    reason: str
    model_version: str

@router.post("/forecast", response_model=ForecastResponse)
def forecast_glucose(req: ForecastRequest):
    history_values = [h.get("value") for h in req.glucose_history if h.get("value") is not None]
    if not history_values:
        history_values = [100.0]
        
    last_val = history_values[-1]
    trend = 0.0
    if len(history_values) > 1:
        diffs = np.diff(history_values[-min(5, len(history_values)):])
        trend = np.mean(diffs)
        
    times = ['+30m', '+1h', '+90m', '+2h', '+2.5h', '+3h']
    forecast = []
    
    for i, t in enumerate(times):
        step = i + 1
        pred = last_val + trend * step * 3 # Extrapolating trend
        ci = 10.0 + (step * 5.0) # Widening CI
        
        forecast.append(ForecastPoint(
            t=t,
            actual=None,
            predicted=round(pred, 1),
            low=round(pred - ci, 1),
            high=round(pred + ci, 1)
        ))
        
    return ForecastResponse(
        forecast=forecast,
        model_version="fallback_moving_average_v1"
    )

@router.post("/risk", response_model=RiskResponse)
def predict_risk(req: RiskRequest):
    history_values = [h.get("value") for h in req.glucose_history if h.get("value") is not None]
    if not history_values:
        history_values = [100.0]
        
    last_val = history_values[-1]
    trend = 0.0
    if len(history_values) > 1:
        diffs = np.diff(history_values[-min(5, len(history_values)):])
        trend = np.mean(diffs)
        
    hypo_risk = 0.05
    hyper_risk = 0.05
    reason = "Glucose is stable and within target range."
    event_type = None
    
    if last_val < 80 and trend < 0:
        hypo_risk = min(0.9 + abs(trend)*0.1, 1.0)
        reason = "Glucose is low and trending downwards. High risk of hypoglycemia."
        event_type = "hypo_risk"
    elif last_val > 160 and trend > 0:
        hyper_risk = min(0.8 + trend*0.1, 1.0)
        reason = "Glucose is high and trending upwards. High risk of hyperglycemia."
        event_type = "hyper_risk"
    elif last_val > 180:
        hyper_risk = 0.7
        reason = "Glucose is elevated."
        event_type = "hyper_risk"
    elif last_val < 70:
        hypo_risk = 0.9
        reason = "Glucose is critically low."
        event_type = "hypo_risk"
        
    if req.recent_meals:
        hyper_risk = min(hyper_risk + 0.2, 1.0)
        if not event_type and hyper_risk > 0.5:
            reason = "Recent meal may increase glucose levels."
            event_type = "hyper_risk"
            
    return RiskResponse(
        hypo_risk=round(hypo_risk, 2),
        hyper_risk=round(hyper_risk, 2),
        event_type=event_type,
        reason=reason,
        model_version="fallback_rule_based_v1"
    )

class AnomalyRequest(BaseModel):
    glucose_history: list[dict]

class AnomalyResponse(BaseModel):
    is_anomaly: bool
    reason: str | None

@router.post("/anomaly", response_model=AnomalyResponse)
def detect_anomaly(request: AnomalyRequest):
    if len(request.glucose_history) < 2:
        return AnomalyResponse(is_anomaly=False, reason=None)
    
    # Sort by timestamp
    try:
        from datetime import datetime
        sorted_history = sorted(
            request.glucose_history, 
            key=lambda x: datetime.fromisoformat(x['timestamp'].replace('Z', '+00:00'))
        )
    except Exception:
        # Fallback if timestamps are weird
        sorted_history = request.glucose_history
        
    for i in range(1, len(sorted_history)):
        prev = sorted_history[i-1]
        curr = sorted_history[i]
        
        # Calculate delta
        val_diff = abs(curr['value'] - prev['value'])
        
        # Basic impossible physiological drop (e.g., > 100 mg/dL in 5 mins)
        if val_diff > 100:
            return AnomalyResponse(
                is_anomaly=True, 
                reason=f"Physiologically implausible change: {val_diff} mg/dL jump between readings."
            )
            
    return AnomalyResponse(is_anomaly=False, reason=None)
