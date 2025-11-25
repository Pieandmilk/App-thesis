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
  if (goal === "weight_loss") return tdee - 300; // ISSN
  if (goal === "muscle_gain") return tdee + 300; // ISSN
  return tdee;
}

export function calculateMacros(weight, calories, goal) {
  let proteinPerKg, carbsPerKg, fatPercent;

  if (goal === "muscle_gain") {
    proteinPerKg = 2;      // ISSN midrange  
    carbsPerKg = 5.5;        // ISSN midrange
    fatPercent = 0.25;       // 25% of calories
  }
  else if (goal === "weight_loss") {
    proteinPerKg = 2.4;      // ISSN recommended high protein
    carbsPerKg = 3.5;        // ISSN midrange for cutting
    fatPercent = 0.25;       // 25% of calories
  }
  else { // maintenance
    proteinPerKg = 1.8;      
    carbsPerKg = 5;        
    fatPercent = 0.30;       
  }

  const protein = proteinPerKg * weight;
  const carbs = carbsPerKg * weight;
  const fat = (calories * fatPercent) / 9;

  return { carbs, protein, fat };
}

