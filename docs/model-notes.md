# Model Notes

## Model Architecture
- **Glucose Forecasting:** Long Short-Term Memory (LSTM) network designed to predict future glucose levels based on historical time-series data.
- **Risk Classification:** Random Forest classifier used to predict the risk level of severe hypo/hyperglycemia based on multi-modal features including glucose trends, dietary input, and user demographics.

## Training Data
- **Current Limitation:** The models for the MVP are trained on synthetic time-series data due to the lack of access to real patient data at this stage.

## Baseline Metrics
- **Glucose Forecasting (LSTM):** 
  - MAE (Mean Absolute Error): [Placeholder - e.g. 15.2 mg/dL]
- **Risk Classification (Random Forest):** 
  - Accuracy: [Placeholder - e.g. 89%]
  - Precision/Recall: [Placeholder]

## NLP Dietary Analysis
- **Current Approach:** We use a rule-based lookup table approach to parse dietary inputs and estimate carbohydrate content.
- **Limitation:** This is a significant simplification and may not accurately reflect complex or non-standard meals.

## Model Versioning
- Models are exported and saved with a versioning scheme that includes a timestamp or commit hash in the filename (e.g., `lstm_model_20231024_1530.h5`, `rf_risk_model_v1.2.0-abcdef.joblib`). This allows for traceability and easy rollbacks.

## Future Improvements
- **Data Acquisition:** Secure and integrate real anonymized patient data to retrain models for improved accuracy and clinical relevance.
- **Model Scaling:** Explore larger, more sophisticated architectures (e.g., Transformers for time-series) once sufficient data is available.
- **Advanced Dietary Analysis:** Integrate computer vision (photo analysis) and LLM-based dietary processing for accurate meal logging and carb estimation.
