import { config } from '../config';

interface ForecastPoint {
  t: string;
  actual: number | null;
  predicted: number;
  low: number;
  high: number;
}

interface ForecastResponse {
  forecast: ForecastPoint[];
  model_version: string;
}

interface RiskResponse {
  hypo_risk: number;
  hyper_risk: number;
  event_type: string | null;
  reason: string;
  model_version: string;
}

interface MealAnalysisResponse {
  estimated_carbs_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number;
  calories: number;
  tag: string;
  recommendation: string;
}

/**
 * HTTP client for the internal ML service.
 * All calls are server-to-server — the ML service is never exposed to the frontend.
 */
export class MLServiceClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.mlServiceUrl;
  }

  /**
   * Get glucose forecast for the next 3 hours.
   */
  async getForecast(
    glucoseHistory: Array<{ value: number; timestamp: string }>,
    recentMeals?: Array<{ description: string; carbs: number; logged_at: string }>,
    recentActivity?: Array<{ type: string; duration_minutes: number; logged_at: string }>
  ): Promise<ForecastResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/predict/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          glucose_history: glucoseHistory.map((r) => ({
            value: r.value,
            timestamp: r.timestamp,
          })),
          recent_meals: recentMeals,
          recent_activity: recentActivity,
        }),
      });

      if (!response.ok) {
        throw new Error(`ML service forecast error: ${response.status}`);
      }

      return (await response.json()) as ForecastResponse;
    } catch (error) {
      console.error('ML forecast service error:', error);
      // Return a safe fallback if ML service is down
      return {
        forecast: [],
        model_version: 'unavailable',
      };
    }
  }

  /**
   * Get hypo/hyper risk prediction.
   */
  async getRiskPrediction(
    glucoseHistory: Array<{ value: number; timestamp: string }>,
    recentMeals?: Array<{ description: string; carbs: number }>,
    medications?: Array<{ name: string; dosage: string }>
  ): Promise<RiskResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/predict/risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          glucose_history: glucoseHistory.map((r) => ({
            value: r.value,
            timestamp: r.timestamp,
          })),
          recent_meals: recentMeals,
          medications,
        }),
      });

      if (!response.ok) {
        throw new Error(`ML service risk error: ${response.status}`);
      }

      return (await response.json()) as RiskResponse;
    } catch (error) {
      console.error('ML risk service error:', error);
      return {
        hypo_risk: 0,
        hyper_risk: 0,
        event_type: null,
        reason: 'ML service unavailable',
        model_version: 'unavailable',
      };
    }
  }

  /**
   * Analyze a meal description for nutritional content.
   */
  async analyzeMeal(description: string, photoUrl?: string | null): Promise<MealAnalysisResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/predict/meal-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          photo_url: photoUrl || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`ML service meal analysis error: ${response.status}`);
      }

      return (await response.json()) as MealAnalysisResponse;
    } catch (error) {
      console.error('ML meal analysis service error:', error);
      // Return safe defaults if ML service is down
      return {
        estimated_carbs_g: description.toLowerCase().includes('roti') ? 30 : description.toLowerCase().includes('dal') ? 20 : 0,
        protein_g: 0,
        fat_g: 0,
        fiber_g: 0,
        calories: description.toLowerCase().includes('roti') ? 120 : description.toLowerCase().includes('dal') ? 150 : 0,
        tag: description.toLowerCase().includes('roti') ? 'Moderate' : description.toLowerCase().includes('dal') ? 'Low Carb' : 'Unknown',
        recommendation: 'ML Service offline. Fallback estimation used.',
      };
    }
  }

  /**
   * Check ML service health.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const mlService = new MLServiceClient();
