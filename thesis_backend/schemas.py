from pydantic import BaseModel, EmailStr
from typing import List
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr

    class Config:
        from_attributes = True 

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    user: UserResponse
    has_profile: bool

class UserProfileForm(BaseModel):
    weight: float
    height: float
    age: int
    sex: str
    sports_category: str
    goal: str
    calories: int
    carbs: int
    protein: int
    fat: int
    ispro: bool = False
    allergies: str = ""

class LogFoodItem(BaseModel):
    food_name: str
    serving_size_grams: float
    calories: float
    protein: float
    carbs: float
    fat: float
    meal_type: str = "Meal"

class LogFoodRequest(BaseModel):
    user_id: int
    meal_id: int
    foods: List[LogFoodItem]

class LogFoodResponse(BaseModel):
    id: int
    user_id: int
    meal_id: int
    food_name: str
    serving_size_grams: float
    calories: float
    protein: float
    carbs: float
    fat: float
    meal_type: str = "Meal"

    class Config:
        from_attributes = True

class MealCreate(BaseModel):
    user_id: int
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fat: float
    meal_type: str = "Meal"
    created_at: datetime = None

class MealResponse(BaseModel):
    id: int
    user_id: int
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fat: float
    meal_type: str = "Meal"
    created_at: datetime

    class Config:
        from_attributes = True
