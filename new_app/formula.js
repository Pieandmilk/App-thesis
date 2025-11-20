export const categoryPAL = {
  endurance: 1.9, 
  strength: 1.7,  
  team: 1.8, 
  skill: 1.6, 
  combat: 1.8 
};

export const eliteMultiplier = 1.15;

export function calculateBMR(weight, height, age, sex) {
  if (sex === "male") {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

export function calculateTDEE(bmr, sportCategory, age, isPro = false) {
  let pal = categoryPAL[sportCategory] || 1.5;
  if (isPro) pal *= eliteMultiplier;
  return bmr * pal;
}

export function adjustCaloriesForGoal(tdee, goal) {
  if (goal === "weight_loss") return tdee - 300;
  if (goal === "muscle_gain") return tdee + 300;
  return tdee;
}

export function calculateMacros(weight, calories) {
  const carbs = weight * 5;
  const protein = weight * 1.8;  
  const fat = (calories * 0.25) / 9; 
  return { carbs, protein, fat };
}
