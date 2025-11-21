import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import axios from "axios";
import styles from "../styles/ResultStyles";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "../UserContext";

export default function ResultNav({ photoUri, userId, BACKEND_URL }) {
  const API_PREDICT_URL = `${BACKEND_URL}/predict/food`;
  const [predictions, setPredictions] = useState([]);
  const [segmentedImage, setSegmentedImage] = useState(null);
  const [servings, setServings] = useState([]);
  const [loading, setLoading] = useState(false);
  const { setMealRefreshCounter } = useUser();
  const [saving, setSaving] = useState(false);

  const [mealTypeModalVisible, setMealTypeModalVisible] = useState(false);

  useEffect(() => {
    if (!photoUri) return;

    const sendPhotoToAPI = async () => {
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append("file", {
          uri: Platform.OS === "ios" ? photoUri.replace("file://", "") : photoUri,
          name: "photo.jpg",
          type: "image/jpeg",
        });

        const response = await axios.post(API_PREDICT_URL, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const { predictions: preds, image } = response.data;
        setPredictions(preds || []);
        setSegmentedImage(image || null);
        setServings(preds.map((p) => p?.nutrition?.serving_weight_grams || 0));
      } catch (error) {
        console.error(error.response || error.message);
        Alert.alert("Error", "Failed to get predictions from server.");
      } finally {
        setLoading(false);
      }
    };

    sendPhotoToAPI();
  }, [photoUri]);

  const totals = useMemo(() => {
    return predictions.reduce(
      (acc, item, idx) => {
        const base = Number(item?.nutrition?.serving_weight_grams) || 0;
        const serving = Number(servings[idx]) || 0;
        const factor = base === 0 ? 0 : serving / base;

        acc.calories += (Number(item?.nutrition?.calories) || 0) * factor;
        acc.protein += (Number(item?.nutrition?.protein) || 0) * factor;
        acc.carbs += (Number(item?.nutrition?.carbs) || 0) * factor;
        acc.fat += (Number(item?.nutrition?.fat) || 0) * factor;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [predictions, servings]);

  const updateServing = (index, text) => {
    const num = Number(text) || 0;
    setServings((prev) => {
      const next = [...prev];
      next[index] = num;
      return next;
    });
  };

  // Open meal type modal
  const openMealTypeModal = () => setMealTypeModalVisible(true);

  // Save meal and foods with selected type
  const saveMealWithType = async (mealType) => {
    try {
      setMealTypeModalVisible(false);
      setSaving(true);

      const now = new Date();
      const localISOTime = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
      ).toISOString();

      // Save meal
      const mealResponse = await axios.post(`${BACKEND_URL}/meal/`, {
        user_id: userId,
        total_calories: totals.calories,
        total_protein: totals.protein,
        total_carbs: totals.carbs,
        total_fat: totals.fat,
        meal_type: mealType, // add meal_type
        created_at: localISOTime,
      });

      const mealId = mealResponse.data.id;

      // Save food logs
      const foodsPayload = predictions.map((item, index) => {
        const baseServing = Number(item?.nutrition?.serving_weight_grams) || 0;
        const serving = Number(servings[index]) || 0;
        const factor = baseServing === 0 ? 0 : serving / baseServing;

        return {
          food_name: item.label,
          serving_size_grams: Number(serving),
          calories: Number((item.nutrition.calories * factor).toFixed(1)),
          protein: Number((item.nutrition.protein * factor).toFixed(1)),
          carbs: Number((item.nutrition.carbs * factor).toFixed(1)),
          fat: Number((item.nutrition.fat * factor).toFixed(1)),
          meal_type: mealType,
        };
      });

      await axios.post(`${BACKEND_URL}/log_food/`, {
        user_id: userId,
        meal_id: mealId,
        foods: foodsPayload,
      });

      setTimeout(() => {
        setSaving(false);
        Alert.alert("Success", `Meal (${mealType}) and food logs saved successfully!`);
        setMealRefreshCounter(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error(error.response || error.message);
      setSaving(false);
      Alert.alert("Error", "Failed to save meal or food logs.");
    }
  };

  if (!photoUri) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", padding: 20 }}>
        <Text style={{ fontSize: 20, fontWeight: "bold", color: "#145a32", textAlign: "center", marginBottom: 10 }}>
          Please capture an image first.
        </Text>
        <Text style={{ fontSize: 14, color: "#1a2a20ff", textAlign: "center" }}>
          Make sure your image clearly shows the food for accurate analysis.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="green" />
        <Text style={{ marginTop: 10, color: "green" }}>Processing image</Text>
      </View>
    );
  }

  if (!loading && predictions.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", padding: 20 }}>
        <View style={styles.section}>
          <Text style={styles.title}>Captured Image</Text>
          <Image source={{ uri: photoUri }} style={styles.image} resizeMode="contain" />
        </View>
        <Text style={{ fontSize: 20, fontWeight: "bold", color: "#145a32", textAlign: "center", marginBottom: 10 }}>
          No food image detected
        </Text>
        <Text style={{ fontSize: 12, color: "#1a2a20ff", textAlign: "center" }}>
          Please ensure your image clearly shows the food, avoid blurry shots, include adequate lighting, and try capturing a closer view. 
          You can also try taking a different angle for better detection.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.section}>
            <Text style={styles.title}>Captured Image</Text>
            <Image source={{ uri: photoUri }} style={styles.image} resizeMode="contain" />
          </View>

          {predictions.length > 0 && (
            <>
              {segmentedImage && (
                <View style={styles.section}>
                  <Text style={styles.title}>Food Recognition</Text>
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${segmentedImage}` }}
                    style={styles.image}
                    resizeMode="contain"
                  />
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.title}>Nutritional Analysis</Text>
                <View style={styles.totalBoxContainer}>
                  <View style={styles.totalBox}>
                    <Text style={styles.totalLabel}>Total Calories</Text>
                    <Text style={styles.totalValue}>{totals.calories.toFixed(1)} kcal</Text>
                  </View>
                  <View style={styles.totalBox}>
                    <Text style={styles.totalLabel}>Total Protein</Text>
                    <Text style={styles.totalValue}>{totals.protein.toFixed(1)} g</Text>
                  </View>
                  <View style={styles.totalBox}>
                    <Text style={styles.totalLabel}>Total Carbs</Text>
                    <Text style={styles.totalValue}>{totals.carbs.toFixed(1)} g</Text>
                  </View>
                  <View style={styles.totalBox}>
                    <Text style={styles.totalLabel}>Total Fat</Text>
                    <Text style={styles.totalValue}>{totals.fat.toFixed(1)} g</Text>
                  </View>
                </View>

                {predictions.map((item, index) => {
                  const baseServing = Number(item?.nutrition?.serving_weight_grams) || 0;
                  const serving = Number(servings[index]) || 0;
                  const factor = baseServing === 0 ? 0 : serving / baseServing;

                  const adjusted = {
                    calories: ((Number(item?.nutrition?.calories) || 0) * factor).toFixed(1),
                    protein: ((Number(item?.nutrition?.protein) || 0) * factor).toFixed(1),
                    carbs: ((Number(item?.nutrition?.carbs) || 0) * factor).toFixed(1),
                    fat: ((Number(item?.nutrition?.fat) || 0) * factor).toFixed(1),
                  };

                  return (
                    <View key={index} style={styles.predItem}>
                      <Text style={styles.predText}>{item.label}</Text>

                      <View style={styles.servingRow}>
                        <Text style={styles.nutritionText}><Text style={{ fontWeight: "bold" }}>Serving Size:</Text></Text>
                        <TextInput
                          style={styles.input}
                          value={String(servings[index] ?? "")}
                          onChangeText={(val) => updateServing(index, val)}
                          keyboardType="numeric"
                        />
                        <Text style={styles.nutritionText}>g</Text>
                      </View>

                      <View style={{ marginTop: 6 }}>
                        <Text style={styles.nutritionText}>Calories: {adjusted.calories} kcal</Text>
                        <Text style={styles.nutritionText}>Protein: {adjusted.protein} g</Text>
                        <Text style={styles.nutritionText}>Carbs: {adjusted.carbs} g</Text>
                        <Text style={styles.nutritionText}>Fat: {adjusted.fat} g</Text>
                      </View>
                    </View>
                  );
                })}

                {/* Save Meal Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: "green",
                    borderRadius: 8,
                    marginTop: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    height: 50,
                    width: "50%",
                    alignSelf: "center",
                  }}
                  onPress={openMealTypeModal}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>
                      Save Meal
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Meal Type Modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={mealTypeModalVisible}
            onRequestClose={() => setMealTypeModalVisible(false)}
          >
            <View style={{ flex:1, justifyContent:"center", alignItems:"center", backgroundColor:"rgba(0,0,0,0.5)" }}>
              <View style={{ width:"80%", backgroundColor:"#fff", padding:20, borderRadius:12 }}>
                <Text style={{ fontSize:18, fontWeight:"bold", marginBottom:10 }}>Select Meal Type</Text>

                {["Breakfast","Lunch","Dinner","Snack"].map((type) => (
                  <Pressable
                    key={type}
                    style={{ backgroundColor:"#c3fbccff", padding:12, borderRadius:8, marginVertical:5, alignItems:"center", borderWidth: 2, borderColor: "green" }}
                    onPress={() => saveMealWithType(type)}
                  >
                    <Text style={{ color:"green", fontWeight:"bold" }}>{type}</Text>
                  </Pressable>
                ))}

                <Pressable
                  style={{ backgroundColor:"#ffbeb7ff", padding:12, borderRadius:8, marginTop:10, alignItems:"center", borderWidth: 2, borderColor: "red" }}
                  onPress={() => setMealTypeModalVisible(false)}
                >
                  <Text style={{ color:"red", fontWeight:"bold" }}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </Modal>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
