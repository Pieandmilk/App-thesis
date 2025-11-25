// generateRecommendation.js - FIXED VERSION
import axios from "axios";
import { Alert } from "react-native";

export const generateRecommendation = async ({ userId, dailyMeals = [], BACKEND_URL }) => {
  try {
    // -------------------------
    // 1. VALIDATION
    // -------------------------
    if (!dailyMeals || dailyMeals.length === 0) {
      Alert.alert("Info", "No meals logged for today. Please log a meal first.");
      return "";
    }

    // -------------------------
    // 2. FETCH USER PROFILE
    // -------------------------
    console.log("Fetching user profile for:", userId);
    const res = await fetch(`${BACKEND_URL}/profile/${userId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch user profile. Status: ${res.status}`);
    }

    const userProfile = await res.json();
    if (!userProfile) throw new Error("User profile not found.");

    console.log("User profile fetched:", userProfile);

    // -------------------------
    // 3. BUILD FOOD LIST
    // -------------------------
    let counter = 1;
    const foodListText = dailyMeals
      .flatMap((meal) =>
        (meal.foods || []).map((food) => {
          const qtyText = food.quantity ? ` (${food.quantity}x)` : "";
          return `${counter++}. ${food.food_name}${qtyText} - ${meal.meal_type}`;
        })
      )
      .join("\n");

    const foodsTextFinal = foodListText || "";

    // -------------------------
    // 4. CHECK IF USER ATE 3 MAIN MEALS
    // -------------------------
    const mealsLogged = dailyMeals.map((m) => (m.meal_type || "").toLowerCase());
    const mainMeals = ["breakfast", "lunch", "dinner"];
    const userAteAllMeals = mainMeals.every((meal) => mealsLogged.includes(meal));

    // -------------------------
    // 5. BUILD PROMPT
    // -------------------------
    let prompt = `
You are a professional and friendly sports nutritionist.
Your job is to recommend meals/snacks based on the user's stats.

### User Stats:
- Age: ${userProfile.age}
- Sex: ${userProfile.sex}
- Weight: ${userProfile.weight}kg
- Height: ${userProfile.height}cm
- Goal: ${userProfile.goal || "Maintain Health"}
- Professional Athlete: ${userProfile.ispro ? "Yes" : "No"}
- Daily Calorie Needs: ${userProfile.calories} kcal
- Macronutrient Targets: Protein ${userProfile.protein}g, Carbs ${userProfile.carbs}g, Fat ${userProfile.fat}g
`;

    if (!foodsTextFinal) {
      prompt += `
The user has not logged any meals today.
Tell them politely to log at least one meal before you give recommendations.
`;
    } else if (userAteAllMeals) {
      prompt += `
The user has eaten all main meals today.
Do NOT recommend more food. Provide a summary and simple guidance for tomorrow.
`;
    } else {
      prompt += `
The user has already eaten the following foods today:
${foodsTextFinal}

Recommend **only new meals or snacks** for the rest of the day, based on the user's stats and remaining calorie/macronutrient needs. 
Do **not** suggest any foods the user has already eaten.

Start your response EXACTLY like this:
You ate today: 
${foodListText}

Hi heres the food recommendation for today:

After listing foods, explain briefly why each one helps.
End with: "Dont forget ... (give helpful advice)"
`;
    }

    console.log("Generated Prompt length:", prompt.length);
    console.log("Sending request to backend...");

    // ---------------
    // 6. CALL AI API
    // ---------------
    const response = await axios.post(
      `${BACKEND_URL}/predict/recommendation`,
      {
        user_id: userId,
        prompt: prompt,
      },
      {
        timeout: 120000
      }
    );

    console.log("Backend response received:", response.status);
    
    const output = response.data?.recommendation || "No recommendation generated";
    console.log("Recommendation generated successfully");

    return output;

  } catch (error) {
    console.log("Recommendation Error Details:");
    console.log("Error message:", error.message);
    console.log("Error response data:", error.response?.data);
    console.log("Error response status:", error.response?.status);
    console.log("Error code:", error.code);
    
    Alert.alert("Error", "Failed to generate recommendation. Please try again.");
    return "";
  }
};
