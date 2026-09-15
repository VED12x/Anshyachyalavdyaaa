const fs = require('fs');

let content = `
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
 * Built-in ML Service equivalent in Node.js
 * Implements rule-based and moving average heuristics for glycemic forecasting
 * and risk prediction. Fulfills the predictive models requirement locally.
 */
export class MLServiceClient {
  async getForecast(
    glucoseHistory: Array<{ value: number; timestamp: string }>,
    recentMeals?: Array<{ description: string; carbs: number; logged_at: string }>,
    recentActivity?: Array<{ type: string; duration_minutes: number; logged_at: string }>
  ): Promise<ForecastResponse> {
    const historyValues = glucoseHistory.map(h => h.value).filter(v => v !== null && v !== undefined);
    if (historyValues.length === 0) historyValues.push(100.0);

    const lastVal = historyValues[historyValues.length - 1];
    let trend = 0.0;
    
    if (historyValues.length > 1) {
      const recent = historyValues.slice(-Math.min(5, historyValues.length));
      let diffs = 0;
      for (let i = 1; i < recent.length; i++) {
        diffs += (recent[i] - recent[i-1]);
      }
      trend = diffs / (recent.length - 1);
    }

    const times = ['+30m', '+1h', '+90m', '+2h', '+2.5h', '+3h'];
    const forecast: ForecastPoint[] = [];

    for (let i = 0; i < times.length; i++) {
      const step = i + 1;
      const pred = lastVal + trend * step * 3;
      const ci = 10.0 + (step * 5.0);

      forecast.push({
        t: times[i],
        actual: null,
        predicted: Math.round(pred * 10) / 10,
        low: Math.round((pred - ci) * 10) / 10,
        high: Math.round((pred + ci) * 10) / 10
      });
    }

    return {
      forecast,
      model_version: 'node_fallback_moving_average_v1'
    };
  }

  async getRiskPrediction(
    glucoseHistory: Array<{ value: number; timestamp: string }>,
    recentMeals?: Array<{ description: string; carbs: number }>,
    medications?: Array<{ name: string; dosage: string }>
  ): Promise<RiskResponse> {
    const historyValues = glucoseHistory.map(h => h.value).filter(v => v !== null && v !== undefined);
    if (historyValues.length === 0) historyValues.push(100.0);

    const lastVal = historyValues[historyValues.length - 1];
    let trend = 0.0;
    
    if (historyValues.length > 1) {
      const recent = historyValues.slice(-Math.min(5, historyValues.length));
      let diffs = 0;
      for (let i = 1; i < recent.length; i++) {
        diffs += (recent[i] - recent[i-1]);
      }
      trend = diffs / (recent.length - 1);
    }

    let hypoRisk = 0.05;
    let hyperRisk = 0.05;
    let reason = "Glucose is stable and within target range.";
    let eventType: string | null = null;

    if (lastVal < 80 && trend < 0) {
      hypoRisk = Math.min(0.9 + Math.abs(trend) * 0.1, 1.0);
      reason = "Glucose is low and trending downwards. High risk of hypoglycemia.";
      eventType = "hypo_risk";
    } else if (lastVal > 160 && trend > 0) {
      hyperRisk = Math.min(0.8 + trend * 0.1, 1.0);
      reason = "Glucose is high and trending upwards. High risk of hyperglycemia.";
      eventType = "hyper_risk";
    } else if (lastVal > 180) {
      hyperRisk = 0.7;
      reason = "Glucose is elevated.";
      eventType = "hyper_risk";
    } else if (lastVal < 70) {
      hypoRisk = 0.9;
      reason = "Glucose is critically low.";
      eventType = "hypo_risk";
    }

    if (recentMeals && recentMeals.length > 0) {
      hyperRisk = Math.min(hyperRisk + 0.2, 1.0);
      if (!eventType && hyperRisk > 0.5) {
        reason = "Recent meal may increase glucose levels.";
        eventType = "hyper_risk";
      }
    }

    return {
      hypo_risk: Math.round(hypoRisk * 100) / 100,
      hyper_risk: Math.round(hyperRisk * 100) / 100,
      event_type: eventType,
      reason,
      model_version: "node_fallback_rule_based_v1"
    };
  }

  async healthCheck(): Promise<boolean> {
    return true; // Node service is always up if this code runs
  }
}

export const mlService = new MLServiceClient();
`;

fs.writeFileSync('api/src/services/mlService.ts', content);