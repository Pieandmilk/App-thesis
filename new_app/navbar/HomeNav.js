import { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useUser } from "../UserContext";
import styles, { PALETTE } from "../styles/HomeNavStyle";

//
// Constants
//
const NUTRIENTS = ["calories", "protein", "carbs", "fat"];
const COLORS = {
  calories: PALETTE.mediumGreen,
  protein: PALETTE.limeGreen,
  carbs: PALETTE.lightGreen,
  fat: PALETTE.yellow,
};
const INITIAL_TOTALS = { calories: 0, protein: 0, carbs: 0, fat: 0 };

//
// Utility Functions
//
const formatDate = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}`;
};

const safeNumber = (val) => (isNaN(Number(val)) ? 0 : Number(val));

const getISODateString = (date) => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
};

//
// Custom Hooks
//
const useGoals = (userId, BACKEND_URL) => {
  const [goals, setGoals] = useState(INITIAL_TOTALS);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/profile/${userId}`);
        const data = await res.json();

        setGoals({
          calories: data.calories || 0,
          protein: data.protein || 0,
          carbs: data.carbs || 0,
          fat: data.fat || 0,
        });
      } catch (error) {
        console.error("Error fetching user goals:", error);
      }
    };

    fetchGoals();
  }, [userId, BACKEND_URL]);

  return goals;
};

const useTodayTotals = (userId, BACKEND_URL, goals, mealRefreshCounter) => {
  const [todayTotals, setTodayTotals] = useState(INITIAL_TOTALS);

  useEffect(() => {
    const fetchTodayMeals = async () => {
      try {
        const date = getISODateString(new Date());
        const res = await fetch(`${BACKEND_URL}/meal/?user_id=${userId}&date=${date}`);
        const meals = await res.json();

        const totals = meals.reduce(
          (acc, meal) => ({
            calories: acc.calories + safeNumber(meal.total_calories),
            protein: acc.protein + safeNumber(meal.total_protein),
            carbs: acc.carbs + safeNumber(meal.total_carbs),
            fat: acc.fat + safeNumber(meal.total_fat),
          }),
          { ...INITIAL_TOTALS }
        );

        setTodayTotals(totals);
      } catch (err) {
        console.error("Error fetching today's meals:", err);
      }
    };

    fetchTodayMeals();
  }, [mealRefreshCounter, userId, BACKEND_URL, goals]);

  return { todayTotals };
};

const useWeeklyData = (userId, BACKEND_URL, mealRefreshCounter) => {
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeeklyData = async () => {
      setLoading(true);
      try {
        // Use Promise.all for parallel requests
        const datePromises = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          const dateString = getISODateString(date);
          
          return fetch(`${BACKEND_URL}/meal/?user_id=${userId}&date=${dateString}`)
            .then(res => res.json())
            .then(meals => {
              const dayTotals = meals.reduce((acc, meal) => ({
                calories: acc.calories + safeNumber(meal.total_calories),
                protein: acc.protein + safeNumber(meal.total_protein),
                carbs: acc.carbs + safeNumber(meal.total_carbs),
                fat: acc.fat + safeNumber(meal.total_fat),
              }), { ...INITIAL_TOTALS });
              
              return { date: formatDate(date), ...dayTotals };
            });
        });

        const data = await Promise.all(datePromises);
        setWeeklyData(data);
      } catch (err) {
        console.error("Error fetching weekly data:", err);
        setWeeklyData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyData();
  }, [mealRefreshCounter, userId, BACKEND_URL]);

  return { weeklyData, loading };
};

//
// Components
//
const ProgressBar = ({ label, value, goal, color }) => {
  const progress = goal > 0 ? Math.min(value / goal, 1) : 0;
  const progressPercent = `${(progress * 100).toFixed(0)}%`;

  return (
    <View style={{ marginBottom: 15 }}>
      <Text style={styles.label}>
        {label}: {value.toFixed(0)} / {goal} 
        <Text style={styles.progressPercent}> ({progressPercent})</Text>
      </Text>
      <View style={styles.progressBarContainer}>
        <View 
          style={[
            styles.progressBarFill,
            {
              backgroundColor: color,
              width: progressPercent,
            }
          ]} 
        />
      </View>
    </View>
  );
};

const NutrientSelectorModal = ({ visible, onClose, onSelectNutrient }) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          {NUTRIENTS.map((nutrient) => (
            <TouchableOpacity
              key={nutrient}
              style={styles.modalItem}
              onPress={() => onSelectNutrient(nutrient)}
            >
              <Text style={styles.modalItemText}>
                {nutrient.charAt(0).toUpperCase() + nutrient.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const WeeklyChart = ({ weeklyData, selectedNutrient, loading, unit }) => {
  const chartData = useMemo(() => ({
    labels: weeklyData.map((d) => d.date),
    datasets: [{
      data: weeklyData.map((d) => d[selectedNutrient]),
    }],
  }), [weeklyData, selectedNutrient]);

  const handleDataPointClick = useCallback(({ value, index }) => {
    Alert.alert(
      selectedNutrient.charAt(0).toUpperCase() + selectedNutrient.slice(1),
      `${weeklyData[index].date}: ${value}${unit}`
    );
  }, [selectedNutrient, weeklyData, unit]);

  if (loading) {
    return <ActivityIndicator size="large" color={PALETTE.mediumGreen} style={{ marginTop: 30 }} />;
  }

  if (weeklyData.length === 0) {
    return <Text style={styles.noData}>No data available</Text>;
  }

  return (
    <View>
      <LineChart
        data={chartData}
        width={Dimensions.get("window").width - 20}
        height={300}
        yAxisSuffix={unit}
        verticalLabelRotation={45}
        chartConfig={{
          backgroundGradientFrom: "#C8E6C9",
          backgroundGradientTo: "#E8F5E9",
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(27, 94, 32, ${opacity})`,
          propsForDots: {
            r: "5",
            fill: COLORS[selectedNutrient],
          },
          propsForBackgroundLines: {
            stroke: "#E0E0E0",
          },
        }}
        bezier
        style={styles.chart}
        onDataPointClick={handleDataPointClick}
      />
    </View>
  );
};

//
// Main Component
//
export default function HomeNav({ userId, BACKEND_URL }) {
  const { mealRefreshCounter } = useUser();
  
  // State
  const [selectedNutrient, setSelectedNutrient] = useState("calories");
  const [modalVisible, setModalVisible] = useState(false);

  // Custom Hooks
  const GOALS = useGoals(userId, BACKEND_URL);
  const { todayTotals } = useTodayTotals(userId, BACKEND_URL, GOALS, mealRefreshCounter);
  const { weeklyData, loading } = useWeeklyData(userId, BACKEND_URL, mealRefreshCounter);

  // Derived values
  const unit = useMemo(() => 
    selectedNutrient === "calories" ? "kcal" : "g", 
    [selectedNutrient]
  );

  // Event Handlers
  const handleNutrientSelect = useCallback((nutrient) => {
    setSelectedNutrient(nutrient);
    setModalVisible(false);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalVisible(false);
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Daily Summary Section */}
      <Text style={[styles.title, { color: PALETTE.darkGreen }]}>Daily Summary</Text>
      
      <ProgressBar 
        label="Calories" 
        value={todayTotals.calories} 
        goal={GOALS.calories} 
        color={COLORS.calories} 
      />
      <ProgressBar 
        label="Protein" 
        value={todayTotals.protein} 
        goal={GOALS.protein} 
        color={COLORS.protein} 
      />
      <ProgressBar 
        label="Carbs" 
        value={todayTotals.carbs} 
        goal={GOALS.carbs} 
        color={COLORS.carbs} 
      />
      <ProgressBar 
        label="Fat" 
        value={todayTotals.fat} 
        goal={GOALS.fat} 
        color={COLORS.fat} 
      />

      {/* Weekly Chart Section */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: PALETTE.darkGreen }]}>Last 7 Days Nutrition</Text>
        <TouchableOpacity 
          style={styles.dropdownBox} 
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.dropdownText}>
            {selectedNutrient.charAt(0).toUpperCase() + selectedNutrient.slice(1)} ▼
          </Text>
        </TouchableOpacity>
      </View>

      <NutrientSelectorModal
        visible={modalVisible}
        onClose={handleModalClose}
        onSelectNutrient={handleNutrientSelect}
      />

      <WeeklyChart
        weeklyData={weeklyData}
        selectedNutrient={selectedNutrient}
        loading={loading}
        unit={unit}
      />
    </ScrollView>
  );
}
