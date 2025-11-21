import { ScrollView, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function AboutScreen() {
  const navigation = useNavigation();

  return (
    <ScrollView 
      contentContainerStyle={styles.container} 
      style={{ backgroundColor: "#ffffff" }}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>About This App</Text>

      <Text style={styles.sectionText}>
        This mobile application is designed to help users make healthier food
        decisions by recognizing food items using a deep learning model (YOLO)
        and providing general dietary recommendations.
      </Text>

      <Text style={styles.sectionTitle}>Version</Text>
      <Text style={styles.sectionText}>1.0.0</Text>

      <Text style={styles.sectionTitle}>Features</Text>
      <Text style={styles.sectionText}>
        • Food recognition using YOLO deep learning model{"\n"}
        • Nutrition estimation{"\n"}
        • General dietary recommendations{"\n"}
        • Simple and clean user interface
      </Text>

      <Text style={styles.sectionTitle}>Developer</Text>
      <Text style={styles.sectionText}>
        Developed by Karl Apolonio, Jan Floyd Benedict, and Kynn Elegado as part of a thesis project focused on applying computer vision
        to support healthy eating habits.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#ffffff",
    flexGrow: 1,
  },
  backButton: {
    marginBottom: 15,
  },
  backText: {
    fontSize: 18,
    color: "#036e05ff",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#444",
    marginTop: 20,
    marginBottom: 5,
  },
  sectionText: {
    fontSize: 16,
    color: "#666",
    lineHeight: 22,
  },
});
