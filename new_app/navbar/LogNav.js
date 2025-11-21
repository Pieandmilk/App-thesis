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
import { useState, useEffect } from "react";
import { useUser } from "../UserContext";
import styles from "../styles/LogNavStyle";
import Markdown from "react-native-markdown-display";
import { generateRecommendation } from "./RecommendationFunction";

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

  const MEAL_ORDER = ["Breakfast", "Lunch", "Dinner", "Snacks"];
  const todayStr = getLocalDateString();

  useEffect(() => {
    fetchMeals(selectedDate);
  }, [selectedDate, mealRefreshCounter]);

  const fetchMeals = async (date) => {
    try {
      setLoadingMeals(true);
      const res = await fetch(`${BACKEND_URL}/meal/?user_id=${userId}&date=${date}`);
      if (!res.ok) {
        setGroupedMeals({});
        return;
      }
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setGroupedMeals({});
        return;
      }

      const grouped = {};
      data.forEach((meal) => {
        const type = meal.meal_type || "Other";
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(meal);
      });

      setGroupedMeals(grouped);
    } catch (err) {
      console.error("Network or fetch error:", err);
      setGroupedMeals({});
    } finally {
      setLoadingMeals(false);
    }
  };

  const fetchFoodLogs = async (meal) => {
    try {
      const res = await fetch(`${BACKEND_URL}/log_food/?user_id=${userId}&meal_id=${meal.id}`);
      const data = await (res.ok ? res.json() : []);
      setFoodLogs(Array.isArray(data) ? data : []);
      setSelectedMeal(meal);
      setModalVisible(true);
    } catch (err) {
      console.error("Network error fetching food logs:", err);
      setFoodLogs([]);
      setSelectedMeal(meal);
      setModalVisible(true);
    }
  };

  const deleteMeal = async (mealId) => {
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
  };

  const handleGenerateRecommendation = async () => {
    const allMeals = Object.values(groupedMeals).flat();
    const allFoodLogs = [];

    for (const meal of allMeals) {
      try {
        const res = await fetch(`${BACKEND_URL}/log_food/?user_id=${userId}&meal_id=${meal.id}`);
        const data = await (res.ok ? res.json() : []);
        if (Array.isArray(data)) {
          allFoodLogs.push({ meal_type: meal.meal_type, foods: data });
        }
      } catch (err) {
        console.error("Error fetching food logs for recommendation:", err);
      }
    }

    setRecModalVisible(true);
    setRecLoading(true);
    setRecommendation("");

    const rec = await generateRecommendation({
      userId,
      BACKEND_URL,
      dailyMeals: allFoodLogs,
    });

    setRecommendation(rec);
    setRecLoading(false);
  };

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  const formatDateTitle = (dateStr) => {
    if (dateStr === todayStr) return "Meals Today";
    if (dateStr === yesterdayStr) return "Meals Yesterday";
    return `Meals on ${new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`;
  };

  const sortedMealTypes = [
    ...MEAL_ORDER.filter((type) => groupedMeals[type]),
    ...Object.keys(groupedMeals).filter((type) => !MEAL_ORDER.includes(type)),
  ];

  return (
    <ScrollView
      style={{ flex: 1, padding: 15, backgroundColor: "#fff" }}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      <Text style={styles.calendarTitle}>{moment(selectedDate).format("MMMM YYYY")}</Text>

      <CalendarStrip
        scrollable
        style={{
          height: 100,
          minHeight: 100,
          paddingTop: 10,
          paddingBottom: 10,
          marginBottom: 20,
        }}
        calendarColor="#27ae60"
        calendarHeaderStyle={{ color: "#ffffff", fontSize: 18, fontWeight: "600" }}
        dateNumberStyle={{ color: "#d4f1d4", fontSize: 16 }}
        dateNameStyle={{ color: "#d4f1d4", fontSize: 12 }}
        selectedDate={moment(selectedDate)}
        showMonth={false}
        highlightDateNumberStyle={{ color: "#ffffff", fontSize: 18, fontWeight: "bold" }}
        highlightDateNameStyle={{ color: "#ffffff", fontSize: 12, fontWeight: "600" }}
        onDateSelected={(date) => setSelectedDate(date.format("YYYY-MM-DD"))}
        useIsoWeek={false}
        iconContainer={{ flex: 0.1 }}
        customDatesStyles={[]}
      />

      <Text style={styles.select}>{formatDateTitle(selectedDate)}</Text>

      {loadingMeals ? (
        <View style={{ marginTop: 30, alignItems: "center" }}>
          <ActivityIndicator size="large" color="#1e7d32" />
        </View>
      ) : sortedMealTypes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No meals recorded for this day.</Text>
        </View>
      ) : (
        <>
          {sortedMealTypes.map((mealType) => (
            <View key={mealType} style={{ marginBottom: 20 }}>
              <Text style={styles.timeHeader}>{mealType}</Text>
              {groupedMeals[mealType].map((meal, idx) => (
                <TouchableOpacity
                  key={meal.id}
                  style={{
                    backgroundColor: "#eaf6ea",
                    borderRadius: 16,
                    padding: 15,
                    marginBottom: 12,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 6,
                    elevation: 3,
                  }}
                  onPress={() => fetchFoodLogs(meal)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#27ae60" }}>
                      {meal.name || `Meal ${idx + 1}`}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#2c3e50" }}>
                      {meal.total_calories.toFixed(1)} kcal
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 12, color: "#34495e", fontWeight: "500" }}>
                      Protein: {meal.total_protein.toFixed(1)} g
                    </Text>
                    <Text style={{ fontSize: 12, color: "#34495e", fontWeight: "500" }}>
                      Carbs: {meal.total_carbs.toFixed(1)} g
                    </Text>
                    <Text style={{ fontSize: 12, color: "#34495e", fontWeight: "500" }}>
                      Fats: {meal.total_fat.toFixed(1)} g
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Generate Recommendation for the whole day (only for today) */}
          {selectedDate === todayStr && sortedMealTypes.length > 0 && (
            <Pressable
              style={[styles.closeButton, { backgroundColor: "#27ae60", marginTop: 10 }]}
              onPress={handleGenerateRecommendation}
            >
              <Text style={styles.closeText}>View Recommendation</Text>
            </Pressable>
          )}
        </>
      )}

      {/* Food Logs Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Food Logs</Text>

            <FlatList
              data={foodLogs}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.foodItem}>
                  <Text style={styles.foodName}>{item.food_name}</Text>
                  <Text style={styles.foodMacros}>
                    Calories: {item.calories.toFixed(1)} kcal{'\n'}
                    Protein: {item.protein.toFixed(1)} g{'\n'}
                    Carbs: {item.carbs.toFixed(1)} g{'\n'}
                    Fat: {item.fat.toFixed(1)} g
                  </Text>
                </View>
              )}
            />

            <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>

            <Pressable
              style={[styles.closeButton, { backgroundColor: "#c0392b", marginTop: 10 }]}
              onPress={() => deleteMeal(selectedMeal.id)}
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
        onRequestClose={() => setRecModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             <Pressable
              style={{
                position: "absolute",
                top: 15,
                right: 15,
                zIndex: 10,
                backgroundColor: "#f2f2f2",
                borderRadius: 25,
                width: 36,
                height: 36,
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={() => setRecModalVisible(false)}
            >
              <Text style={{ fontSize: 22, fontWeight: "bold", color: "#c0392b" }}>×</Text>
            </Pressable>

            {recLoading ? (
              <View style={{ marginTop: 50, alignItems: "center" }}>
                <ActivityIndicator size="large" color="#27ae60" />
                <Text style={{ marginTop: 10, fontSize: 16 }}>Recommending...</Text>
              </View>
            ) : (
              <ScrollView style={{ marginTop: 40, maxHeight: "80%" }}>
                <Markdown style={markdownStyles}>{recommendation}</Markdown>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const markdownStyles = {
  body: { fontSize: 14, color: "#333", lineHeight: 20 },
  heading1: { fontSize: 18, fontWeight: "bold", color: "#27ae60" },
  heading2: { fontSize: 16, fontWeight: "bold", color: "#27ae60" },
  strong: { fontWeight: "bold", color: "#d35400" },
  list_item: { marginBottom: 3 },
};
