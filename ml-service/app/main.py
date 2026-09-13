from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.predict import router as predict_router
from app.routes.meal_analysis import router as meal_analysis_router

app = FastAPI(title="DiabetesCare 360 ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Model loading from disk could be initialized here
    pass

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ml-service"}

app.include_router(predict_router)
app.include_router(meal_analysis_router)
