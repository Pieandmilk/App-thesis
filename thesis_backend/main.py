from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from route.predict import router as predict_router
from route.account import router as account_router
from route.account_profile import router as account_profile_router
from route.meal import router as meal_router
from route.log_food import router as log_food_router
from route.recommendation import router as recommendation_router
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(predict_router)
app.include_router(account_router)
app.include_router(account_profile_router)
app.include_router(meal_router)
app.include_router(log_food_router)
app.include_router(recommendation_router)

@app.get("/")
def root():
    return {"message": "API is running", "status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
