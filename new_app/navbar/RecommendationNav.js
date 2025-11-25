import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Switch,
} from "react-native";
import axios from "axios";
import Markdown from "react-native-markdown-display";
import { MaterialIcons, FontAwesome5, Ionicons } from "@expo/vector-icons";

// Constants
const API_CONFIG = {
  timeout: 120000,
  headers: { "ngrok-skip-browser-warning": "true" }
};

// Utility Functions
const formatGoal = (goal) => {
  if (!goal) return "Health";
  return goal
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

// Custom Hooks
const useUserProfile = (userId, BACKEND_URL) => {
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/profile/${userId}`);
        const data = await res.json();
        setUserProfile(data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId, BACKEND_URL]);

  return userProfile;
};

// Components
const LoadingState = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#2e7d32" />
    <Text style={styles.loadingText}>Loading Profile...</Text>
  </View>
);

const Header = () => (
  <View style={styles.headerContainer}>
    <MaterialIcons name="health-and-safety" size={32} color="#2e7d32" />
    <Text style={styles.headerTitle}>AI Nutritionist</Text>
  </View>
);

const StatItem = ({ icon, label, value, iconColor = "#555" }) => (
  <View style={styles.statItem}>
    {icon}
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const ProfileDashboard = React.memo(({ userProfile }) => {
  const stats = useMemo(() => [
    {
      icon: <FontAwesome5 name="weight" size={18} color="#555" />,
      label: "Weight",
      value: `${userProfile.weight} kg`
    },
    {
      icon: <MaterialIcons name="height" size={22} color="#555" />,
      label: "Height",
      value: `${userProfile.height} cm`
    },
    {
      icon: <MaterialIcons name="track-changes" size={22} color="#555" />,
      label: "Goal",
      value: formatGoal(userProfile.goal)
    },
    {
      icon: <FontAwesome5 name="fire" size={18} color="#d35400" />,
      label: "Calories",
      value: userProfile.calories
    }
  ], [userProfile]);

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>My Stats</Text>
      
      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <StatItem key={index} {...stat} />
        ))}
      </View>

      <View style={styles.macrosContainer}>
        <Text style={styles.macroText}>Protein: {userProfile.protein}g</Text>
        <Text style={styles.macroText}>Carbs: {userProfile.carbs}g</Text>
        <Text style={styles.macroText}>Fat: {userProfile.fat}g</Text>
      </View>
    </View>
  );
});

const SportsModeToggle = React.memo(({ isSportsMode, setIsSportsMode }) => {
  const handleToggle = useCallback(() => {
    setIsSportsMode(prev => !prev);
  }, [setIsSportsMode]);

  return (
    <View style={styles.toggleContainer}>
      <View style={styles.toggleTextContainer}>
        <Ionicons 
          name={isSportsMode ? "fitness" : "body"} 
          size={24} 
          color={isSportsMode ? "#d35400" : "#2e7d32"} 
        />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.toggleTitle}>
            {isSportsMode ? "Sports Mode" : "General Mode"}
          </Text>
          <Text style={styles.toggleSubtitle}>
            {isSportsMode ? "Detailed performance & timing advice" : "Simple & balanced advice"}
          </Text>
        </View>
      </View>
      <Switch
        trackColor={{ false: "#767577", true: "#ffcc80" }}
        thumbColor={isSportsMode ? "#d35400" : "#f4f3f4"}
        ios_backgroundColor="#3e3e3e"
        onValueChange={handleToggle}
        value={isSportsMode}
      />
    </View>
  );
});

const GenerateButton = React.memo(({ loading, isSportsMode, onPress }) => {
  const buttonStyle = useMemo(() => [
    styles.button,
    loading && styles.buttonDisabled,
    isSportsMode && styles.buttonSports
  ], [loading, isSportsMode]);

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ActivityIndicator color="#fff" style={{ marginRight: 10 }}/>
          <Text style={styles.buttonText}>Analyzing Profile...</Text>
        </View>
      ) : (
        <Text style={styles.buttonText}>
          {isSportsMode ? "Generate Meal Plan" : "Generate Meal Plan"}
        </Text>
      )}
    </TouchableOpacity>
  );
});

const RecommendationResult = React.memo(({ recommendation, isSportsMode }) => {
  if (!recommendation) return null;

  const resultHeaderStyle = useMemo(() => [
    styles.resultHeader,
    isSportsMode && styles.resultHeaderSports
  ], [isSportsMode]);

  return (
    <View style={styles.resultCard}>
      <View style={resultHeaderStyle}>
        <MaterialIcons 
          name={isSportsMode ? "fitness-center" : "restaurant-menu"} 
          size={24} 
          color="#fff" 
        />
        <Text style={styles.resultTitle}>
          {isSportsMode ? "Athlete's Strategy" : "Suggested Plan"}
        </Text>
      </View>
      
      <View style={styles.markdownContainer}>
        <Markdown style={markdownStyles}>
          {recommendation}
        </Markdown>
      </View>
    </View>
  );
});

// Main Component
export default function RecommendationNav({ userId, BACKEND_URL }) {
  const [recommendation, setRecommendation] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSportsMode, setIsSportsMode] = useState(false);

  const userProfile = useUserProfile(userId, BACKEND_URL);

  const generateRecommendation = useCallback(async () => {
    if (!userProfile) {
      Alert.alert("Error", "User profile not found");
      return;
    }

    setLoading(true);
    setRecommendation("");

    try {
      const modeInstruction = isSportsMode
        ? `**MODE: PROFESSIONAL ATHLETE (SPORTS MODE)**
- Include **Pre-Workout** and **Post-Workout** meal recommendations.
- Explain the *timing* of carbohydrates and proteins.
- Focus on performance recovery and energy optimization.`
        : `**MODE: GENERAL HEALTH (BEGINNER)**
- Keep it simple, easy to follow, and encouraging.
- Focus on balanced, tasty Filipino meals.`;

      const prompt = `You are a supportive nutritionist.
User Stats:
- Age: ${userProfile.age}
- Sex: ${userProfile.sex}
- Sports Category: ${userProfile.sports_category}
- Weight: ${userProfile.weight}kg
- Height: ${userProfile.height}cm
- Goal: ${formatGoal(userProfile.goal)}

${modeInstruction}

Your Task:
Create a 1-Day Meal Plan (Filipino Style).
Format using Markdown:
- Use ## for Sections (Breakfast, Lunch, Dinner, Workout Nutrition).
- Use **bold** for food names.
- Use bullet points for macros.`;

          // This sends the simple data your Python backend expects
    const response = await axios.post(
      `${BACKEND_URL}/predict/recommendation`, // <--- The correct endpoint defined in recommendation.py
      {
        user_id: userId,  // <--- Matches "user_id" in RecommendationRequest class
        prompt: prompt    // <--- Matches "prompt" in RecommendationRequest class
      },
      {
        timeout: 120000 // Keep the timeout long for AI generation
      }
    );

    

      const content = response.data.choices[0].message.content;
      setRecommendation(content || "No recommendation generated");
    } catch (error) {
      console.error("Error generating recommendation:", error);
      Alert.alert("Error", "Failed to generate recommendation. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [userProfile, isSportsMode]);

  if (!userProfile) {
    return <LoadingState />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        style={styles.mainContainer}
        showsVerticalScrollIndicator={false}
      >
        <Header />
        <ProfileDashboard userProfile={userProfile} />
        <SportsModeToggle 
          isSportsMode={isSportsMode} 
          setIsSportsMode={setIsSportsMode} 
        />
        <GenerateButton 
          loading={loading}
          isSportsMode={isSportsMode}
          onPress={generateRecommendation}
        />
        <RecommendationResult 
          recommendation={recommendation}
          isSportsMode={isSportsMode}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Styles remain the same as your original
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2e7d32",
    marginLeft: 10,
  },
  
  // Profile Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statItem: {
    width: "48%",
    backgroundColor: "#f1f8e9",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2e7d32",
  },
  macrosContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  macroText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },

  // Toggle Container
  toggleContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  toggleSubtitle: {
    fontSize: 12,
    color: "#666",
  },

  // Button
  button: {
    backgroundColor: "#2e7d32",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#2e7d32",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 25,
  },
  buttonSports: {
    backgroundColor: "#d35400",
    shadowColor: "#d35400",
  },
  buttonDisabled: {
    backgroundColor: "#a5d6a7",
  },
  buttonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },

  // Result Card
  resultCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  resultHeader: {
    backgroundColor: "#43a047",
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  resultHeaderSports: {
    backgroundColor: "#e67e22",
  },
  resultTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  markdownContainer: {
    padding: 20,
  },
});

// Markdown Styles
const markdownStyles = {
  body: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
  },
  heading1: {
    fontSize: 22,
    color: "#2e7d32",
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 10,
  },
  heading2: {
    fontSize: 20,
    color: "#2e7d32",
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 5,
  },
  strong: {
    fontWeight: "bold",
    color: "#d35400",
  },
  list_item: {
    marginBottom: 5,
  },
};
