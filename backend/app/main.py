from fastapi import FastAPI, UploadFile, File
import pandas as pd
import io

app = FastAPI(title="Gym Churn Analysis", version="0.1.0")

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

        return {
            "filename": file.filename,
            "rows": df.shape[0],
            "columns": df.columns.tolist(),
            "status": "File redeemed successfully. Ready for ML analysis",
        }
    except Exception as e:
        return {"error": f"CSV not processed properly: {str(e)}"}
