from fastapi import APIRouter, HTTPException, Body
from database.supabase_connection import supabase
from schemas import UserProfileForm

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.post("/submit/{user_id}")
def submit_profile(user_id: int, form: UserProfileForm = Body(...)):
    try:
        # Check if user exists
        user_resp = (
            supabase.table("users")
            .select("*")
            .eq("id", user_id)
            .single()
            .execute()
        )

        if not user_resp or not getattr(user_resp, "data", None):
            raise HTTPException(status_code=404, detail="User not found")

        # Check if profile exists
        profile_resp = (
            supabase.table("user_profile_data")
            .select("*")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        profile_exists = profile_resp is not None and getattr(profile_resp, "data", None) is not None

        payload = {
            "weight": float(form.weight),       
            "height": float(form.height),       
            "age": int(form.age),            
            "sex": form.sex,
            "sports_category": form.sports_category,
            "goal": form.goal,
            "ispro": form.ispro,
            "calories": int(form.calories),    
            "carbs": int(form.carbs),           
            "protein": int(form.protein),        
            "fat": int(form.fat)                 
        }

        if profile_exists:
            supabase.table("user_profile_data").update(payload).eq("user_id", user_id).execute()
            return {"message": "Profile updated successfully"}

        supabase.table("user_profile_data").insert({"user_id": user_id, **payload}).execute()
        return {"message": "Profile created successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@router.get("/{user_id}")
def get_profile(user_id: int):
    try:
        resp = (
            supabase.table("user_profile_data")
            .select("*")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        if not resp or resp.data is None:
            raise HTTPException(status_code=404, detail="Profile not found")

        return resp.data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")