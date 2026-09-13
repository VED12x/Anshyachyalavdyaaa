def test_meal_analysis_rotis(client):
    res = client.post("/predict/meal-analysis", json={"description": "2 rotis with dal"}).json()
    assert 40 <= res["estimated_carbs_g"] <= 80

def test_meal_analysis_salad(client):
    res = client.post("/predict/meal-analysis", json={"description": "chicken salad, no dressing"}).json()
    assert 5 <= res["estimated_carbs_g"] <= 25

def test_meal_analysis_different_results(client):
    res1 = client.post("/predict/meal-analysis", json={"description": "2 rotis with dal"}).json()
    res2 = client.post("/predict/meal-analysis", json={"description": "chicken salad"}).json()
    assert res1["estimated_carbs_g"] != res2["estimated_carbs_g"]

def test_meal_analysis_tag(client):
    res = client.post("/predict/meal-analysis", json={"description": "2 rotis"}).json()
    assert res["tag"] in ['Balanced', 'High Carb', 'Low Carb', 'Moderate']
