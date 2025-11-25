import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import CalendarStrip from "react-native-calendar-strip";
import moment from "moment";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useUser } from "../UserContext";
import styles from "../styles/LogNavStyle";
import Markdown from "react-native-markdown-display";
import { generateRecommendation } from "./RecommendationFunction";

// Constants
const MEAL_ORDER = ["Breakfast", "Lunch", "Dinner", "Snacks"];

// Utility Functions
const getLocalDateString = (date = new Date()) => {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localTime.toISOString().split("T")[0];
};

export default function LogNav({ userId, BACKEND_URL }) {
  const { mealRefreshCounter, triggerMealRefresh } = useUser();
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [groupedMeals, setGroupedMeals] = useState({});
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [foodLogs, setFoodLogs] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [recommendation, setRecommendation] = useState("");
  const [recModalVisible, setRecModalVisible] = useState(false);
  const [recLoading, setRecLoading] = useState(false);

  // Cache refs
  const mealsCache = useRef(new Map());
  const foodLogsCache = useRef(new Map());

  // Memoized values
  const todayStr = useMemo(() => getLocalDateString(), []);
  const yesterdayStr = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return getLocalDateString(yesterday);
  }, []);

  const formatDateTitle = useCallback((dateStr) => {
    if (dateStr === todayStr) return "Meals Today";
    if (dateStr === yesterdayStr) return "Meals Yesterday";
    return `Meals on ${new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`;
  }, [todayStr, yesterdayStr]);

  const sortedMealTypes = useMemo(() => [
    ...MEAL_ORDER.filter((type) => groupedMeals[type]),
    ...Object.keys(groupedMeals).filter((type) => !MEAL_ORDER.includes(type)),
  ], [groupedMeals]);

  const hasMeals = useMemo(() => sortedMealTypes.length > 0, [sortedMealTypes]);
  const isToday = useMemo(() => selectedDate === todayStr, [selectedDate, todayStr]);

  // Markdown styles
  const markdownStyles = useMemo(() => ({
    body: styles.markdownBody,
    heading1: styles.markdownHeading1,
    heading2: styles.markdownHeading2,
    strong: styles.markdownStrong,
    list_item: styles.markdownListItem,
  }), []);

  // Data fetching with caching
  const fetchMeals = useCallback(async (date) => {
    // Check cache first
    if (mealsCache.current.has(date)) {
      setGroupedMeals(mealsCache.current.get(date));
      return;
    }

    try {
      setLoadingMeals(true);
      const res = await fetch(`${BACKEND_URL}/meal/?user_id=${userId}&date=${date}`);
      
      if (!res.ok) {
        const emptyData = {};
        mealsCache.current.set(date, emptyData);
        setGroupedMeals(emptyData);
        return;
      }
      
      const data = await res.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        const emptyData = {};
        mealsCache.current.set(date, emptyData);
        setGroupedMeals(emptyData);
        return;
      }

      const grouped = data.reduce((acc, meal) => {
        const type = meal.meal_type || "Other";
        if (!acc[type]) acc[type] = [];
        acc[type].push(meal);
        return acc;
      }, {});

      // Cache the result
      mealsCache.current.set(date, grouped);
      setGroupedMeals(grouped);
    } catch (err) {
      console.error("Network or fetch error:", err);
      const emptyData = {};
      mealsCache.current.set(date, emptyData);
      setGroupedMeals(emptyData);
    } finally {
      setLoadingMeals(false);
    }
  }, [userId, BACKEND_URL]);

  // Invalidate cache when mealRefreshCounter changes
  useEffect(() => {
    mealsCache.current.clear();
    foodLogsCache.current.clear();
    fetchMeals(selectedDate);
  }, [mealRefreshCounter, selectedDate, fetchMeals]);

  const fetchFoodLogs = useCallback(async (meal) => {
    const cacheKey = `${meal.id}`;
    
    // Check cache first
    if (foodLogsCache.current.has(cacheKey)) {
      setFoodLogs(foodLogsCache.current.get(cacheKey));
      setSelectedMeal(meal);
      setModalVisible(true);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/log_food/?user_id=${userId}&meal_id=${meal.id}`);
      const data = await (res.ok ? res.json() : []);
      const foodLogsData = Array.isArray(data) ? data : [];
      
      // Cache the result
      foodLogsCache.current.set(cacheKey, foodLogsData);
      setFoodLogs(foodLogsData);
      setSelectedMeal(meal);
      setModalVisible(true);
    } catch (err) {
      console.error("Network error fetching food logs:", err);
      const emptyData = [];
      foodLogsCache.current.set(cacheKey, emptyData);
      setFoodLogs(emptyData);
      setSelectedMeal(meal);
      setModalVisible(true);
    }
  }, [userId, BACKEND_URL]);

  const deleteMeal = useCallback(async (mealId) => {
    Alert.alert(
      "Delete Meal",
      "Are you sure you want to delete this meal? All associated food logs will be removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${BACKEND_URL}/meal/${mealId}`, { method: "DELETE" });
              const data = await res.json();
              if (res.ok) {
                // Clear relevant caches
                mealsCache.current.delete(selectedDate);
                foodLogsCache.current.delete(mealId.toString());
                
                setModalVisible(false);
                fetchMeals(selectedDate);
                triggerMealRefresh();
              } else {
                Alert.alert("Error", data.detail || "Failed to delete meal");
              }
            } catch (err) {
              console.error("Delete meal error:", err);
              Alert.alert("Error", "Network or server error");
            }
          },
        },
      ]
    );
  }, [BACKEND_URL, fetchMeals, selectedDate, triggerMealRefresh]);

  // FIXED: handleGenerateRecommendation function
  const handleGenerateRecommendation = useCallback(async () => {
    console.log("Starting recommendation generation...");
    
    const allMeals = Object.values(groupedMeals).flat();
    console.log("Total meals found:", allMeals.length);

    if (allMeals.length === 0) {
      Alert.alert("Info", "No meals found for today. Please log some meals first.");
      return;
    }

    // Use Promise.all for parallel requests with caching
    const foodLogPromises = allMeals.map(async (meal) => {
      const cacheKey = `${meal.id}`;
      
      // Check cache first
      if (foodLogsCache.current.has(cacheKey)) {
        const cachedFoods = foodLogsCache.current.get(cacheKey);
        console.log(`Using cached foods for meal ${meal.id}:`, cachedFoods.length);
        return { 
          meal_type: meal.meal_type, 
          foods: cachedFoods 
        };
      }

      try {
        console.log(`Fetching food logs for meal ${meal.id}...`);
        const res = await fetch(`${BACKEND_URL}/log_food/?user_id=${userId}&meal_id=${meal.id}`);
        
        if (!res.ok) {
          console.log(`Failed to fetch food logs for meal ${meal.id}, status: ${res.status}`);
          return null;
        }
        
        const data = await res.json();
        if (Array.isArray(data)) {
          console.log(`Fetched ${data.length} foods for meal ${meal.id}`);
          foodLogsCache.current.set(cacheKey, data);
          return { 
            meal_type: meal.meal_type, 
            foods: data 
          };
        }
        return null;
      } catch (err) {
        console.error(`Error fetching food logs for meal ${meal.id}:`, err);
        return null;
      }
    });

    setRecModalVisible(true);
    setRecLoading(true);
    setRecommendation("");

    try {
      console.log("Waiting for all food logs to be fetched...");
      const results = await Promise.all(foodLogPromises);
      const allFoodLogs = results.filter(Boolean);
      
      console.log("Successfully fetched food logs for meals:", allFoodLogs.length);
      console.log("Food logs data structure:", JSON.stringify(allFoodLogs, null, 2));

      if (allFoodLogs.length === 0) {
        setRecommendation("No food logs found for the meals. Please add foods to your meals first.");
        return;
      }

      console.log("Calling generateRecommendation with:", {
        userId,
        BACKEND_URL,
        dailyMeals: allFoodLogs
      });

      const rec = await generateRecommendation({
        userId: userId,
        BACKEND_URL: BACKEND_URL,
        dailyMeals: allFoodLogs,
      });

      console.log("Recommendation received:", rec ? "Yes" : "No");
      setRecommendation(rec || "No recommendation could be generated.");
      
    } catch (error) {
      console.error("Error in recommendation process:", error);
      setRecommendation("Sorry, we couldn't generate a recommendation at this time. Please try again.");
    } finally {
      setRecLoading(false);
    }
  }, [groupedMeals, userId, BACKEND_URL]);

  // Event handlers
  const handleDateSelect = useCallback((date) => {
    const newDate = date.format("YYYY-MM-DD");
    setSelectedDate(newDate);
    
    // Only fetch if not in cache
    if (!mealsCache.current.has(newDate)) {
      fetchMeals(newDate);
    } else {
      setGroupedMeals(mealsCache.current.get(newDate));
    }
  }, [fetchMeals]);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleCloseRecModal = useCallback(() => {
    setRecModalVisible(false);
  }, []);

  const handleMealPress = useCallback((meal) => {
    fetchFoodLogs(meal);
  }, [fetchFoodLogs]);

  // Render functions
  const renderFoodItem = useCallback(({ item }) => (
    <View style={styles.foodItem}>
      <Text style={styles.foodName}>{item.food_name}</Text>
      <Text style={styles.foodMacros}>
        Calories: {item.calories.toFixed(1)} kcal{'\n'}
        Protein: {item.protein.toFixed(1)} g{'\n'}
        Carbs: {item.carbs.toFixed(1)} g{'\n'}
        Fat: {item.fat.toFixed(1)} g
      </Text>
    </View>
  ), []);

  const renderMealCard = useCallback((meal, idx) => (
    <TouchableOpacity
      key={meal.id}
      style={styles.mealCard}
      onPress={() => handleMealPress(meal)}
      activeOpacity={0.8}
    >
      <View style={styles.mealHeader}>
        <Text style={styles.mealName}>
          {meal.name || `Meal ${idx + 1}`}
        </Text>
        <Text style={styles.mealCalories}>
          {meal.total_calories.toFixed(1)} kcal
        </Text>
      </View>
      <View style={styles.macrosRow}>
        <Text style={styles.macroText}>
          Protein: {meal.total_protein.toFixed(1)} g
        </Text>
        <Text style={styles.macroText}>
          Carbs: {meal.total_carbs.toFixed(1)} g
        </Text>
        <Text style={styles.macroText}>
          Fats: {meal.total_fat.toFixed(1)} g
        </Text>
      </View>
    </TouchableOpacity>
  ), [handleMealPress]);

  return (
    <ScrollView
      style={{ flex: 1, padding: 15, backgroundColor: "#fff" }}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      <Text style={styles.calendarTitle}>{moment(selectedDate).format("MMMM YYYY")}</Text>

      <CalendarStrip
        scrollable
        style={styles.calendarStrip}
        calendarColor="#27ae60"
        calendarHeaderStyle={styles.calendarHeader}
        dateNumberStyle={styles.dateNumber}
        dateNameStyle={styles.dateName}
        selectedDate={moment(selectedDate)}
        showMonth={false}
        highlightDateNumberStyle={styles.highlightDateNumber}
        highlightDateNameStyle={styles.highlightDateName}
        onDateSelected={handleDateSelect}
        useIsoWeek={false}
        iconContainer={{ flex: 0.1 }}
        customDatesStyles={[]}
      />

      <Text style={styles.select}>{formatDateTitle(selectedDate)}</Text>

      {loadingMeals ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e7d32" />
        </View>
      ) : !hasMeals ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No meals recorded for this day.</Text>
        </View>
      ) : (
        <>
          {sortedMealTypes.map((mealType) => (
            <View key={mealType} style={{ marginBottom: 20 }}>
              <Text style={styles.timeHeader}>{mealType}</Text>
              {groupedMeals[mealType].map((meal, idx) => renderMealCard(meal, idx))}
            </View>
          ))}

          {isToday && hasMeals && (
            <Pressable
              style={[styles.closeButton, { marginTop: 10 }]}
              onPress={handleGenerateRecommendation}
            >
              <Text style={styles.closeText}>View Recommendation</Text>
            </Pressable>
          )}
        </>
      )}

      {/* Food Logs Modal */}
      <Modal
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Food Logs</Text>

            <FlatList
              data={foodLogs}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderFoodItem}
            />

            <Pressable style={styles.closeButton} onPress={handleCloseModal}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>

            <Pressable
              style={[styles.closeButton, styles.deleteButton, { marginTop: 10 }]}
              onPress={() => deleteMeal(selectedMeal?.id)}
            >
              <Text style={styles.closeText}>Delete Meal</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Recommendation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={recModalVisible}
        onRequestClose={handleCloseRecModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Pressable
              style={styles.closeIcon}
              onPress={handleCloseRecModal}
            >
              <Text style={styles.closeIconText}>×</Text>
            </Pressable>

            {recLoading ? (
              <View style={styles.recLoadingContainer}>
                <ActivityIndicator size="large" color="#27ae60" />
                <Text style={styles.loadingText}>Generating Recommendation...</Text>
              </View>
            ) : (
              <ScrollView style={styles.recommendationScroll}>
                <Markdown style={markdownStyles}>{recommendation}</Markdown>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
