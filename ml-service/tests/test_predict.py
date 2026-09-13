def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "ml-service"}

def test_forecast_shape(client, flat_glucose_history):
    response = client.post("/predict/forecast", json={"glucose_history": flat_glucose_history})
    assert response.status_code == 200
    data = response.json()
    assert "forecast" in data
    assert len(data["forecast"]) == 6
    assert "t" in data["forecast"][0]
    assert "predicted" in data["forecast"][0]
    assert "low" in data["forecast"][0]
    assert "high" in data["forecast"][0]

def test_forecast_rising_vs_flat(client, flat_glucose_history, rising_glucose_history):
    res_flat = client.post("/predict/forecast", json={"glucose_history": flat_glucose_history}).json()
    res_rising = client.post("/predict/forecast", json={"glucose_history": rising_glucose_history}).json()
    
    pred_flat = res_flat["forecast"][-1]["predicted"]
    pred_rising = res_rising["forecast"][-1]["predicted"]
    
    assert pred_rising > pred_flat

def test_risk_rising(client):
    high_history = [{"value": 180 + (i*2), "timestamp": f"T{i}"} for i in range(12)]
    res = client.post("/predict/risk", json={"glucose_history": high_history}).json()
    assert res["hyper_risk"] > 0.5
    assert res["event_type"] == "hyper_risk"

def test_risk_falling(client):
    low_history = [{"value": 90 - (i*2), "timestamp": f"T{i}"} for i in range(12)]
    res = client.post("/predict/risk", json={"glucose_history": low_history}).json()
    assert res["hypo_risk"] > 0.5
    assert res["event_type"] == "hypo_risk"
