from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

router = APIRouter(prefix="/predict", tags=["recommendation"])

# 1. Define the schema for the JSON body
class RecommendationRequest(BaseModel):
    user_id: int
    prompt: str

@router.post("/recommendation")
async def get_recommendation(request: RecommendationRequest):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
            
                "http://127.0.0.1:1234/v1/chat/completions",
                
            
                headers={"ngrok-skip-browser-warning": "true"},
                
                json={
                    "model": "local-model",
                    "messages": [{"role": "user", "content": request.prompt}],
                    "temperature": 0.7,
                    "max_tokens": 1000
                },
                # Ngrok can be slightly slower than localhost, so we keep the long timeout
                timeout=120.0 
            )
        
        data = response.json()
        
        # Error check: Did we get the warning page despite the header?
        if "choices" not in data:
            print("Ngrok Error Response:", data)
            raise HTTPException(status_code=500, detail="Received invalid response from Ngrok. Check terminal logs.")

        return {
            "user_id": request.user_id,
            "recommendation": data["choices"][0]["message"]["content"]
        }
    except Exception as e:
        print(f"AI Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))