import axios from "axios";
import { Alert } from "react-native";

export const generateRecommendation = async ({ userId, dailyMeals = [], BACKEND_URL }) => {
  try {
    if (!dailyMeals || dailyMeals.length === 0) {
      Alert.alert("Info", "No meals logged for today. Please log a meal first.");
      return "";
    }

    // 1. Fetch user profile
    const res = await fetch(`${BACKEND_URL}/profile/${userId}`);
    const userProfile = await res.json();
    if (!userProfile) throw new Error("User profile not found");

    // 2. Prepare food list text
    let foodCounter = 1;
    const foodListText = dailyMeals
      .flatMap((meal) =>
        (meal.foods || []).map((f) => {
          const qtyText = f.quantity ? ` (${f.quantity}x)` : "";
          return `${foodCounter++}. ${f.food_name}${qtyText} - ${meal.meal_type || "Meal"}`;
        })
      )
      .join("\n");

    const foodsTextFinal = foodListText || "";

    // 3. Determine if user has eaten all main meals
    const mealsLogged = dailyMeals.map((meal) => meal.meal_type.toLowerCase());
    const mainMeals = ["breakfast", "lunch", "dinner"];
    const userAteAllMeals = mainMeals.every((meal) => mealsLogged.includes(meal));

    // 4. Build AI prompt
    let prompt = `
You are a professional and friendly sports nutritionist.
Your task is to give clear, actionable, and encouraging advice to help the user balance the rest of their meals today. 
Your recommendations must always consider the user’s stats (age, weight, height, goal, calories, and macros). 
Your tone should be supportive, positive, and simple.

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
      // No meals logged
      prompt += `
The user has not logged any meals today. 
Ask them politely to log at least one meal (breakfast, lunch, dinner, or snack) before giving a recommendation.
`;
    } else if (userAteAllMeals) {
      // All main meals logged
      prompt += `
The user has eaten all their meals for today. 
Do not recommend anything for today. 
Instead, provide a friendly summary and give guidance or tips for tomorrow's meals based on the user's stats.
`;
    } else {
      // Some meals logged
      prompt += `
The user has already eaten the following foods today:
${foodsTextFinal}

Recommend **only new meals or snacks** for the rest of the day, based on the user's stats and remaining calorie/macronutrient needs. 
Do **not** suggest any foods the user has already eaten.

**Start your response exactly like this:**

Hi heres the food recommendation for today:

After listing the new foods, write a short, friendly description of each item (e.g., "the quinoa provides protein and fiber…"). 
End with a sentence starting with "Dont forget" that gives practical, positive tips for the rest of the day's meals. 
Keep it supportive, simple, and actionable, as if you were coaching the user personally.
`;
    }

    console.log("AI Prompt:", prompt);

    // 5. Call AI API
    const response = await axios.post(
      "https://oversteadily-unengendered-bonny.ngrok-free.dev/v1/chat/completions",
      {
        model: "local-model",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 400,
      },
      {
        headers: { "ngrok-skip-browser-warning": "true" },
        timeout: 120000,
      }
    );

    return response.data?.choices?.[0]?.message?.content || "No recommendation generated";
  } catch (error) {
    console.error("Recommendation error:", error);
    Alert.alert("Error", "Failed to generate recommendation.");
    return "";
  }
};
