import { ScrollView, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { flexGrow: 1 }]}
      style={{ backgroundColor: "#ffffff" }} 
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.date}>Last Updated: November 2025</Text>

      <Text style={styles.sectionTitle}>1. Information We Collect</Text>
      <Text style={styles.sectionText}>
        • User ID is collected automatically for login and session tracking{"\n"}
        • Personal data (age, height, weight, and athletic goals) is required to calculate 
        macronutrients and calories to support the user's daily dietary targets.
      </Text>

      <Text style={styles.sectionTitle}>2. How We Use Your Data</Text>
      <Text style={styles.sectionText}>
        • Food recognition for analysis{"\n"}
        • Nutrition and caloric analysis based on provided personal data{"\n"}
        • Provide general dietary recommendations{"\n"}
        • Improve app functionality and performance{"\n\n"}
        We do not sell or share your data with third parties.
      </Text>

      <Text style={styles.sectionTitle}>3. Image Handling</Text>
      <Text style={styles.sectionText}>
        Images are processed only for predictions and are not stored permanently.
      </Text>

      <Text style={styles.sectionTitle}>4. Data Storage</Text>
      <Text style={styles.sectionText}>
        • AsyncStorage (local device){"\n"}
        • Supabase (account information)
      </Text>

      <Text style={styles.sectionTitle}>5. Your Rights</Text>
      <Text style={styles.sectionText}>
        • Request account deletion{"\n"}
        • Request removal of personal data{"\n"}
        • Stop usage anytime by uninstalling the app
      </Text>

      <Text style={styles.sectionTitle}>6. Contact Us</Text>
      <Text style={styles.sectionText}>
        Email: thesisnine65@gmail.com
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#ffffff",
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
  date: {
    fontSize: 14,
    color: "#888",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
    marginTop: 20,
    marginBottom: 5,
  },
  sectionText: {
    fontSize: 16,
    color: "#555",
    lineHeight: 22,
  },
});
