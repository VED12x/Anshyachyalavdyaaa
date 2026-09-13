import json
import os
import re
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/predict", tags=["meal_analysis"])

class MealAnalysisRequest(BaseModel):
    description: str
    photo_url: Optional[str] = None

class MealAnalysisResponse(BaseModel):
    estimated_carbs_g: float
    protein_g: float
    fat_g: float
    fiber_g: float
    calories: float
    tag: str
    recommendation: str

FOOD_DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'food_db.json')
try:
    with open(FOOD_DB_PATH, 'r') as f:
        FOOD_DB = json.load(f)
except FileNotFoundError:
    FOOD_DB = []

def normalize_text(text: str) -> str:
    return re.sub(r'[^\w\s]', '', text.lower())

@router.post("/meal-analysis", response_model=MealAnalysisResponse)
def analyze_meal(req: MealAnalysisRequest):
    desc = normalize_text(req.description)
    
    carbs = 0.0
    protein = 0.0
    fat = 0.0
    fiber = 0.0
    calories = 0.0
    
    matched_items = []
    
    for item in FOOD_DB:
        aliases = [item['name'].lower()] + [a.lower() for a in item.get('aliases', [])]
        for alias in aliases:
            if alias in desc:
                quantity = 1.0
                idx = desc.find(alias)
                if idx > 0:
                    prefix = desc[:idx].strip().split()
                    if prefix and prefix[-1].isdigit():
                        quantity = float(prefix[-1])
                    elif prefix and prefix[-1] in ['a', 'an', 'one']:
                        quantity = 1.0
                    elif prefix and prefix[-1] in ['two']:
                        quantity = 2.0
                        
                carbs += item['carbs_g'] * quantity
                protein += item['protein_g'] * quantity
                fat += item['fat_g'] * quantity
                fiber += item['fiber_g'] * quantity
                calories += item['calories'] * quantity
                matched_items.append(item['name'])
                break
                
    if carbs < 30:
        tag = 'Low Carb'
    elif carbs <= 50:
        tag = 'Balanced'
    elif carbs <= 80:
        tag = 'Moderate'
    else:
        tag = 'High Carb'
        
    if tag == 'Low Carb':
        recommendation = "Great choice! This meal should have a minimal impact on your blood glucose."
    elif tag == 'Balanced':
        recommendation = "Good balanced meal. Monitor your glucose normally."
    elif tag == 'Moderate':
        recommendation = "Moderate carbohydrate content. Consider a short walk after eating."
    else:
        recommendation = "High carbohydrate meal. Consider a bolus adjustment or exercise to manage spikes."

    if not matched_items:
        carbs = len(desc) * 1.5
        if carbs < 30: tag = 'Low Carb'
        elif carbs <= 50: tag = 'Balanced'
        elif carbs <= 80: tag = 'Moderate'
        else: tag = 'High Carb'

    return MealAnalysisResponse(
        estimated_carbs_g=round(carbs, 1),
        protein_g=round(protein, 1),
        fat_g=round(fat, 1),
        fiber_g=round(fiber, 1),
        calories=round(calories, 1),
        tag=tag,
        recommendation=recommendation
    )
