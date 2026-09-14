
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
