import axios from "axios";
import { Alert } from "react-native";

export const generateRecommendation = async ({ userId, dailyMeals = [], BACKEND_URL }) => {
  try {

    // -------------------------
    // FETCH USER PROFILE
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
    // BUILD FOOD LIST
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
    // CHECK IF USER ATE 3 MAIN MEALS
    // -------------------------
    const mealsLogged = dailyMeals.map((m) => (m.meal_type || "").toLowerCase());
    const mainMeals = ["breakfast", "lunch", "dinner"];
    const userAteAllMeals = mainMeals.every((meal) => mealsLogged.includes(meal));

    // -------------------------
    // BUILD PROMPT (WITH ALLERGIES)
    // -------------------------
  let prompt = `
You are a professional sports nutritionist specializing in food allergy safety.

CRITICAL ALLERGY INFORMATION:
${userProfile.allergies ? 
`USER HAS ALLERGIES TO: ${userProfile.allergies.toUpperCase()}
- ABSOLUTELY FORBIDDEN to recommend any foods containing these allergens
- Avoid cross-contamination risks
- Double-check every food recommendation for safety` : 
'No known allergies'}

USER PROFILE:
- Age: ${userProfile.age}
- Sex: ${userProfile.sex}
- Weight: ${userProfile.weight}kg
- Height: ${userProfile.height}cm
- Goal: ${userProfile.goal || "Maintain Health"}
- Professional Athlete: ${userProfile.ispro ? "Yes" : "No"}
- Daily Calories: ${userProfile.calories} kcal
- Protein Target: ${userProfile.protein}g
- Carbs Target: ${userProfile.carbs}g
- Fat Target: ${userProfile.fat}g
`;

if (!foodsTextFinal) {
  prompt += `
The user hasn't logged any meals today.
Politely ask them to log their first meal before providing recommendations.
`;
} else if (userAteAllMeals) {
  prompt += `
The user has completed all main meals today.
Provide a daily summary and helpful tips for tomorrow instead of more food recommendations.
`;
} else {
  prompt += `
TODAY'S FOOD LOG:
${foodsTextFinal}

RECOMMENDATION GUIDELINES:
• Recommend only NEW meals/snacks (avoid repeating today's foods)
• Base suggestions on remaining calorie/macro needs
• MAXIMUM 4 food recommendations
• Use ONLY bullet points (no numbering)
• Provide VARIED options each time
• ${userProfile.allergies ? `CRITICAL: 100% avoid ${userProfile.allergies}` : 'No allergy restrictions'}

RESPONSE FORMAT - FOLLOW EXACTLY:

You ate today:
${foodListText}

Your food allergies: ${userProfile.allergies || 'None'}

Hi! Here's your food recommendation for today:

**Your Recommendations:**
• [Food 1] - [Brief benefit explanation]
• [Food 2] - [Brief benefit explanation] 
• [Food 3] - [Brief benefit explanation]
• [Food 4] - [Brief benefit explanation]

Don't forget to [specific helpful advice based on user's goals]
`;
}

    console.log("Generated Prompt length:", prompt.length);
    console.log("Sending request to backend...");

    // ---------------
    // CALL AI API
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
    
    // Debugging
    console.log("Actual AI Response:", output);

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
