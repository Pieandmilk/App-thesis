import axios from "axios";
import { Alert } from "react-native";

// Constants
const AI_API_URL = "https://oversteadily-unengendered-bonny.ngrok-free.dev/v1/chat/completions";
const AI_CONFIG = {
  model: "local-model",
  temperature: 0.7,
  max_tokens: 400,
};
const API_HEADERS = { "ngrok-skip-browser-warning": "true" };
const API_TIMEOUT = 120000;

// Utility Functions
const buildFoodListText = (dailyMeals) => {
  if (!dailyMeals || dailyMeals.length === 0) return "";

  let foodCounter = 1;
  return dailyMeals
    .flatMap((meal) =>
      (meal.foods || []).map((food) => {
        const quantityText = food.quantity ? ` (${food.quantity}x)` : "";
        return `${foodCounter++}. ${food.food_name}${quantityText} - ${meal.meal_type || "Meal"}`;
      })
    )
    .join("\n");
};

const hasEatenAllMainMeals = (dailyMeals) => {
  const mainMeals = ["breakfast", "lunch", "dinner"];
  const loggedMealTypes = dailyMeals.map(meal => meal.meal_type?.toLowerCase() || "");
  return mainMeals.every(meal => loggedMealTypes.includes(meal));
};

const buildUserStatsPrompt = (userProfile) => `
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

const buildPromptForNoMeals = (userStats) => `
${userStats}
The user has not logged any meals today. 
Ask them politely to log at least one meal (breakfast, lunch, dinner, or snack) before giving a recommendation.
`;

const buildPromptForAllMeals = (userStats) => `
${userStats}
The user has eaten all their meals for today. 
Do not recommend anything for today. 
Instead, provide a friendly summary and give guidance or tips for tomorrow's meals based on the user's stats.
`;

const buildPromptForPartialMeals = (userStats, foodListText) => `
${userStats}
The user has already eaten the following foods today:
${foodListText}

Recommend **only new meals or snacks** for the rest of the day, based on the user's stats and remaining calorie/macronutrient needs. 
Do **not** suggest any foods the user has already eaten.

**Start your response exactly like this:**
You ate today: 
${foodListText}

Hi, here are the food recommendations that match what you’ve eaten today:

After listing the new foods, write a short, friendly description of each item (e.g., "the quinoa provides protein and fiber…"). 
End with a sentence starting with "Dont forget" that gives practical, positive tips for the rest of the day's meals. 
Keep it supportive, simple, and actionable, as if you were coaching the user personally.
`;

// Main Function
export const generateRecommendation = async ({ userId, dailyMeals = [], BACKEND_URL }) => {
  try {
    // Early validation
    if (!dailyMeals || dailyMeals.length === 0) {
      Alert.alert("Info", "No meals logged for today. Please log a meal first.");
      return "";
    }

    // Fetch user profile
    const profileResponse = await fetch(`${BACKEND_URL}/profile/${userId}`);
    if (!profileResponse.ok) throw new Error("Failed to fetch user profile");
    
    const userProfile = await profileResponse.json();
    if (!userProfile) throw new Error("User profile not found");

    // Build food list and determine meal status
    const foodListText = buildFoodListText(dailyMeals);
    const userAteAllMeals = hasEatenAllMainMeals(dailyMeals);
    const userStats = buildUserStatsPrompt(userProfile);

    // Build appropriate prompt
    let prompt = `You are a professional and friendly sports nutritionist.
Your task is to give clear, actionable, and encouraging advice to help the user balance the rest of their meals today. 
Your recommendations must always consider the user's stats (age, weight, height, goal, calories, and macros). 
Your tone should be supportive, positive, and simple.
`;

    if (!foodListText) {
      prompt += buildPromptForNoMeals(userStats);
    } else if (userAteAllMeals) {
      prompt += buildPromptForAllMeals(userStats);
    } else {
      prompt += buildPromptForPartialMeals(userStats, foodListText);
    }

    console.log("AI Prompt:", prompt);

    // Call AI API
    const response = await axios.post(
      AI_API_URL,
      {
        ...AI_CONFIG,
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: API_HEADERS,
        timeout: API_TIMEOUT,
      }
    );

    return response.data?.choices?.[0]?.message?.content || "No recommendation generated";

  } catch (error) {
    console.error("Recommendation error:", error);
    
    // More specific error messages
    if (error.code === 'ECONNABORTED') {
      Alert.alert("Error", "Request timed out. Please try again.");
    } else if (error.response) {
      Alert.alert("Error", "AI service is currently unavailable.");
    } else {
      Alert.alert("Error", "Failed to generate recommendation. Please check your connection.");
    }
    
    return "";
  }
};
