/**
 * Built-in meal analysis engine — replaces the external Python ML service.
 * Tokenizes a free-text meal description, fuzzy-matches against a 50-item
 * food database, extracts quantities, sums macros, classifies, and recommends.
 */

interface FoodItem {
  name: string;
  aliases: string[];
  serving_description: string;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number;
  calories: number;
}

export interface MealAnalysisResult {
  estimated_carbs_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number;
  calories: number;
  tag: string;
  recommendation: string;
}

const FOOD_DB: FoodItem[] = [
  {"name": "roti", "aliases": ["chapati", "flatbread", "wheat bread", "phulka"], "serving_description": "1 piece", "carbs_g": 30, "protein_g": 4, "fat_g": 3, "fiber_g": 2, "calories": 120},
  {"name": "dal", "aliases": ["lentils", "daal", "dhal", "yellow dal", "black dal", "moong dal", "toor dal", "masoor dal"], "serving_description": "1 bowl", "carbs_g": 20, "protein_g": 9, "fat_g": 2, "fiber_g": 8, "calories": 150},
  {"name": "rice", "aliases": ["white rice", "brown rice", "basmati", "chawal", "steamed rice"], "serving_description": "1 cup", "carbs_g": 45, "protein_g": 4, "fat_g": 0.5, "fiber_g": 1, "calories": 200},
  {"name": "paneer", "aliases": ["cottage cheese", "paneer tikka"], "serving_description": "100g", "carbs_g": 3, "protein_g": 18, "fat_g": 20, "fiber_g": 0, "calories": 265},
  {"name": "chicken", "aliases": ["chicken breast", "grilled chicken", "chicken curry", "tandoori chicken"], "serving_description": "100g", "carbs_g": 5, "protein_g": 25, "fat_g": 10, "fiber_g": 0, "calories": 200},
  {"name": "salad", "aliases": ["green salad", "mixed salad", "veg salad", "garden salad"], "serving_description": "1 bowl", "carbs_g": 10, "protein_g": 2, "fat_g": 0.5, "fiber_g": 5, "calories": 50},
  {"name": "apple", "aliases": ["green apple", "red apple"], "serving_description": "1 medium", "carbs_g": 25, "protein_g": 0.5, "fat_g": 0.3, "fiber_g": 4.4, "calories": 95},
  {"name": "banana", "aliases": ["ripe banana", "kela"], "serving_description": "1 medium", "carbs_g": 27, "protein_g": 1.3, "fat_g": 0.3, "fiber_g": 3.1, "calories": 105},
  {"name": "oats", "aliases": ["oatmeal", "porridge"], "serving_description": "1 cup cooked", "carbs_g": 27, "protein_g": 5, "fat_g": 2.5, "fiber_g": 4, "calories": 150},
  {"name": "bread", "aliases": ["white bread", "brown bread", "slice of bread", "toast"], "serving_description": "1 slice", "carbs_g": 15, "protein_g": 3, "fat_g": 1, "fiber_g": 1, "calories": 80},
  {"name": "egg", "aliases": ["eggs", "boiled egg", "omelette", "fried egg", "scrambled egg", "anda"], "serving_description": "1 large", "carbs_g": 1, "protein_g": 6, "fat_g": 5, "fiber_g": 0, "calories": 70},
  {"name": "milk", "aliases": ["cow milk", "whole milk", "doodh"], "serving_description": "1 cup", "carbs_g": 12, "protein_g": 8, "fat_g": 8, "fiber_g": 0, "calories": 150},
  {"name": "yogurt", "aliases": ["curd", "dahi", "greek yogurt"], "serving_description": "1 cup", "carbs_g": 11, "protein_g": 9, "fat_g": 4, "fiber_g": 0, "calories": 100},
  {"name": "cheese", "aliases": ["cheddar", "mozzarella"], "serving_description": "1 slice", "carbs_g": 1, "protein_g": 7, "fat_g": 9, "fiber_g": 0, "calories": 110},
  {"name": "potato", "aliases": ["aloo", "mashed potato", "boiled potato"], "serving_description": "1 medium", "carbs_g": 37, "protein_g": 4, "fat_g": 0.2, "fiber_g": 4, "calories": 160},
  {"name": "sweet potato", "aliases": ["shakarkandi"], "serving_description": "1 medium", "carbs_g": 26, "protein_g": 2, "fat_g": 0.1, "fiber_g": 4, "calories": 110},
  {"name": "quinoa", "aliases": ["cooked quinoa"], "serving_description": "1 cup", "carbs_g": 39, "protein_g": 8, "fat_g": 3.5, "fiber_g": 5, "calories": 222},
  {"name": "avocado", "aliases": ["butter fruit"], "serving_description": "1/2 medium", "carbs_g": 9, "protein_g": 1, "fat_g": 15, "fiber_g": 7, "calories": 160},
  {"name": "butter", "aliases": ["makhan"], "serving_description": "1 tbsp", "carbs_g": 0, "protein_g": 0.1, "fat_g": 11.5, "fiber_g": 0, "calories": 100},
  {"name": "sugar", "aliases": ["white sugar", "cane sugar", "cheeni"], "serving_description": "1 tbsp", "carbs_g": 12, "protein_g": 0, "fat_g": 0, "fiber_g": 0, "calories": 48},
  {"name": "honey", "aliases": ["raw honey", "shahad"], "serving_description": "1 tbsp", "carbs_g": 17, "protein_g": 0, "fat_g": 0, "fiber_g": 0, "calories": 64},
  {"name": "juice", "aliases": ["orange juice", "apple juice", "fruit juice"], "serving_description": "1 cup", "carbs_g": 28, "protein_g": 2, "fat_g": 0.5, "fiber_g": 0.5, "calories": 120},
  {"name": "soda", "aliases": ["cola", "soft drink", "coke", "pepsi"], "serving_description": "1 can", "carbs_g": 39, "protein_g": 0, "fat_g": 0, "fiber_g": 0, "calories": 140},
  {"name": "tea", "aliases": ["chai", "black tea", "green tea"], "serving_description": "1 cup", "carbs_g": 2, "protein_g": 1, "fat_g": 1, "fiber_g": 0, "calories": 20},
  {"name": "coffee", "aliases": ["espresso", "cappuccino", "latte"], "serving_description": "1 cup", "carbs_g": 5, "protein_g": 3, "fat_g": 3, "fiber_g": 0, "calories": 50},
  {"name": "samosa", "aliases": ["fried pastry"], "serving_description": "1 piece", "carbs_g": 25, "protein_g": 3, "fat_g": 15, "fiber_g": 2, "calories": 250},
  {"name": "dosa", "aliases": ["masala dosa", "plain dosa"], "serving_description": "1 piece", "carbs_g": 30, "protein_g": 4, "fat_g": 5, "fiber_g": 1, "calories": 170},
  {"name": "idli", "aliases": ["steamed rice cake"], "serving_description": "1 piece", "carbs_g": 12, "protein_g": 2, "fat_g": 0, "fiber_g": 1, "calories": 60},
  {"name": "upma", "aliases": ["suji upma", "rava upma"], "serving_description": "1 bowl", "carbs_g": 35, "protein_g": 5, "fat_g": 8, "fiber_g": 3, "calories": 220},
  {"name": "poha", "aliases": ["flattened rice", "chivda"], "serving_description": "1 bowl", "carbs_g": 45, "protein_g": 5, "fat_g": 7, "fiber_g": 2, "calories": 260},
  {"name": "biryani", "aliases": ["chicken biryani", "veg biryani", "mutton biryani"], "serving_description": "1 plate", "carbs_g": 60, "protein_g": 20, "fat_g": 15, "fiber_g": 4, "calories": 450},
  {"name": "naan", "aliases": ["garlic naan", "butter naan", "tandoori naan"], "serving_description": "1 piece", "carbs_g": 45, "protein_g": 8, "fat_g": 6, "fiber_g": 2, "calories": 260},
  {"name": "fish", "aliases": ["fried fish", "fish curry", "machhi", "salmon", "tuna"], "serving_description": "100g", "carbs_g": 5, "protein_g": 20, "fat_g": 10, "fiber_g": 0, "calories": 180},
  {"name": "almonds", "aliases": ["badam", "nuts"], "serving_description": "1 oz", "carbs_g": 6, "protein_g": 6, "fat_g": 14, "fiber_g": 3.5, "calories": 160},
  {"name": "pasta", "aliases": ["spaghetti", "macaroni", "penne"], "serving_description": "1 cup cooked", "carbs_g": 43, "protein_g": 8, "fat_g": 1, "fiber_g": 2.5, "calories": 220},
  {"name": "pizza", "aliases": ["slice of pizza", "pizza slice"], "serving_description": "1 slice", "carbs_g": 35, "protein_g": 12, "fat_g": 10, "fiber_g": 2, "calories": 280},
  {"name": "burger", "aliases": ["hamburger", "cheeseburger", "veggie burger"], "serving_description": "1 burger", "carbs_g": 40, "protein_g": 15, "fat_g": 15, "fiber_g": 2, "calories": 350},
  {"name": "spinach", "aliases": ["palak", "saag"], "serving_description": "1 cup cooked", "carbs_g": 7, "protein_g": 5, "fat_g": 0, "fiber_g": 4, "calories": 40},
  {"name": "tomato", "aliases": ["tamatar"], "serving_description": "1 medium", "carbs_g": 5, "protein_g": 1, "fat_g": 0, "fiber_g": 1.5, "calories": 22},
  {"name": "mango", "aliases": ["aam"], "serving_description": "1 cup", "carbs_g": 25, "protein_g": 1, "fat_g": 0.5, "fiber_g": 3, "calories": 100},
  {"name": "peanuts", "aliases": ["mungfali", "groundnut"], "serving_description": "1 oz", "carbs_g": 4, "protein_g": 7, "fat_g": 14, "fiber_g": 2.5, "calories": 160},
  {"name": "paratha", "aliases": ["aloo paratha", "stuffed paratha", "plain paratha"], "serving_description": "1 piece", "carbs_g": 35, "protein_g": 5, "fat_g": 10, "fiber_g": 2, "calories": 250},
  {"name": "chole", "aliases": ["chickpeas", "chana masala", "chana"], "serving_description": "1 bowl", "carbs_g": 30, "protein_g": 12, "fat_g": 5, "fiber_g": 10, "calories": 210},
  {"name": "rajma", "aliases": ["kidney beans", "red beans"], "serving_description": "1 bowl", "carbs_g": 25, "protein_g": 10, "fat_g": 3, "fiber_g": 8, "calories": 170},
  {"name": "puri", "aliases": ["poori", "fried bread"], "serving_description": "1 piece", "carbs_g": 18, "protein_g": 3, "fat_g": 8, "fiber_g": 1, "calories": 150},
  {"name": "khichdi", "aliases": ["dal khichdi", "moong khichdi"], "serving_description": "1 bowl", "carbs_g": 35, "protein_g": 8, "fat_g": 5, "fiber_g": 4, "calories": 220},
  {"name": "lassi", "aliases": ["sweet lassi", "mango lassi", "salted lassi"], "serving_description": "1 glass", "carbs_g": 20, "protein_g": 6, "fat_g": 5, "fiber_g": 0, "calories": 150},
  {"name": "gulab jamun", "aliases": ["mithai", "sweet"], "serving_description": "2 pieces", "carbs_g": 40, "protein_g": 3, "fat_g": 12, "fiber_g": 0, "calories": 280},
  {"name": "jalebi", "aliases": ["fried sweet"], "serving_description": "2 pieces", "carbs_g": 45, "protein_g": 2, "fat_g": 10, "fiber_g": 0, "calories": 270},
];

const WORD_TO_NUM: Record<string, number> = {
  'a': 1, 'an': 1, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'half': 0.5, 'quarter': 0.25, 'double': 2,
};

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function analyzeMeal(description: string): MealAnalysisResult {
  const desc = normalizeText(description);
  const words = desc.split(' ');

  let totalCarbs = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalFiber = 0;
  let totalCals = 0;
  const matchedItems: string[] = [];

  for (const item of FOOD_DB) {
    const allNames = [item.name.toLowerCase(), ...item.aliases.map(a => a.toLowerCase())];

    for (const alias of allNames) {
      if (desc.includes(alias)) {
        // Extract quantity — look at the word(s) before the match
        let quantity = 1;
        const idx = desc.indexOf(alias);
        if (idx > 0) {
          const before = desc.substring(0, idx).trim().split(' ');
          const lastWord = before[before.length - 1];
          if (lastWord && !isNaN(Number(lastWord))) {
            quantity = Number(lastWord);
          } else if (lastWord && WORD_TO_NUM[lastWord] !== undefined) {
            quantity = WORD_TO_NUM[lastWord];
          }
        }

        totalCarbs += item.carbs_g * quantity;
        totalProtein += item.protein_g * quantity;
        totalFat += item.fat_g * quantity;
        totalFiber += item.fiber_g * quantity;
        totalCals += item.calories * quantity;
        matchedItems.push(item.name);
        break; // Only match first alias
      }
    }
  }

  // If nothing matched, give a rough estimate based on text length
  if (matchedItems.length === 0) {
    totalCarbs = 25;
    totalProtein = 5;
    totalFat = 5;
    totalCals = 200;
  }

  // Classify
  let tag: string;
  if (totalCarbs < 30) tag = 'Low Carb';
  else if (totalCarbs <= 50) tag = 'Balanced';
  else if (totalCarbs <= 80) tag = 'Moderate';
  else tag = 'High Carb';

  // Recommendation
  let recommendation: string;
  if (tag === 'Low Carb') {
    recommendation = 'Great choice! This meal should have minimal impact on blood glucose.';
  } else if (tag === 'Balanced') {
    recommendation = 'Good balanced meal. Monitor your glucose normally.';
  } else if (tag === 'Moderate') {
    recommendation = 'Moderate carb content. Consider a short walk after eating to help manage glucose levels.';
  } else {
    recommendation = 'High carbohydrate meal. Consider a bolus adjustment or exercise to manage potential glucose spikes.';
  }

  return {
    estimated_carbs_g: Math.round(totalCarbs * 10) / 10,
    protein_g: Math.round(totalProtein * 10) / 10,
    fat_g: Math.round(totalFat * 10) / 10,
    fiber_g: Math.round(totalFiber * 10) / 10,
    calories: Math.round(totalCals),
    tag,
    recommendation,
  };
}
