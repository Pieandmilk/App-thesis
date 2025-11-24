import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
import json
from dotenv import load_dotenv
from database.supabase_connection import supabase

# Load .env
load_dotenv()

# Nutritionix
NUTRITIONIX_APP_ID = os.getenv("NUTRITIONIX_APP_ID")
NUTRITIONIX_APP_KEY = os.getenv("NUTRITIONIX_APP_KEY")

def get_food_data(foods):
    url = "https://trackapi.nutritionix.com/v2/natural/nutrients"
    headers = {
        "Content-Type": "application/json",
        "x-app-id": NUTRITIONIX_APP_ID,
        "x-app-key": NUTRITIONIX_APP_KEY
    }

    food_data = []

    for food in foods:
        try:
            body = {"query": food}
            response = requests.post(url, headers=headers, data=json.dumps(body))
            response.raise_for_status()
            data = response.json()

            if data.get("foods"):
                f = data["foods"][0]
                food_data.append({
                    "food_name": f['food_name'].title(),
                    "calories": f.get('nf_calories'),
                    "protein": f.get('nf_protein'),
                    "carbs": f.get('nf_total_carbohydrate'),
                    "fat": f.get('nf_total_fat'),
                    "serving_weight_grams": f.get('serving_weight_grams')
                })
            else:
                food_data.append({
                    "food_name": food,
                    "calories": None,
                    "protein": None,
                    "carbs": None,
                    "fat": None,
                    "serving_weight_grams": None
                })

        except Exception as e:
            print(f"Error fetching data for {food}: {e}")

    return food_data

def send_data_to_supabase(food_df):
    if not food_df:
        return "No data to insert."

    try:
        for food in food_df:
            supabase.table("food_nutrition_data").upsert({
                "food_name": food["food_name"],
                "calories": food["calories"],
                "protein": food["protein"],
                "carbs": food["carbs"],
                "fat": food["fat"],
                "serving_weight_grams": food["serving_weight_grams"]
            }).execute()

        return "Data inserted successfully into Supabase"

    except Exception as e:
        return f"Error inserting data: {e}"

if __name__ == "__main__":
    food_list = [
        "Whole Chicken", "Chicken Breast", "Chicken Wings", "Chicken Leg", "Chicken Thigh",
        "Egg", "Tofu", "Pork", "Lean Beef", "Sweet Potato",
        "Potatoes", "Rice", "Whole Wheat Bread", "White Bread", "Scrambled Egg",
        "Fried Egg", "Chicken", "Tilapia", "Broccoli", "Boiled Egg", "Banana", "Ground Beef"
    ]
    
    food_df = get_food_data(food_list)
    response = send_data_to_supabase(food_df)
    print(response)
