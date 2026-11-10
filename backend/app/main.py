from fastapi import FastAPI, UploadFile, File
import pandas as pd
import io
import joblib

app = FastAPI(title="Gym Churn Analysis", version="0.1.0")

MODEL_PATH = "app/ml/models/gym_churn_baseline.joblib"
try:
    model = joblib.load(MODEL_PATH)
    print("Model loaded successfully")
except Exception as e:
    model = None
    print(f"Model loading error: {e}")
@app.get("/")
def read_root():
    return {"status": "ok", "message": "System works in the background"}

@app.post("/api/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename or not file.filename.endswith('.csv'):
        return {"error": "Program expected file with .csv extension"}

    contents = await file.read()

    try:
        df: pd.DataFrame = pd.read_csv(io.BytesIO(contents)) # type: ignore

        if model is None:
            return {"error": "Model is not accessible on the server"}

        df_features = df.copy()

        if "Churn" in df_features.columns:
            df_features = df_features.drop(columns=["Churn"])

        df_features["frequency_delta"] = df_features["Avg_class_frequency_current_month"] - df_features[
            "Avg_class_frequency_total"]
        df_features = df_features.drop(columns=["Month_to_end_contract", "Avg_class_frequency_total"], errors='ignore')

        probabilities = model.predict_proba(df_features)[:, 1]

        df["churn_probability"] = probabilities
        df_sorted = df.sort_values(by="churn_probability", ascending=False)

        return {
            "filename": file.filename,
            "rows": df.shape[0],
            "columns": df.columns.tolist(),
            "status": "File redeemed successfully. Ready for ML analysis",
            "top_10_risk": df_sorted.head(10).to_dict(orient="records")
        }
    except Exception as e:
        return {"error": f"CSV not processed properly: {str(e)}"}
