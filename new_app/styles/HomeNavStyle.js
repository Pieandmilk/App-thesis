import { StyleSheet } from "react-native";

export const PALETTE = {
  darkGreen: "#1B5E20",
  mediumGreen: "#2E7D32",
  lightGreen: "#81C784",
  limeGreen: "#A5D6A7",
  yellow: "#d9d768ff",
};

export default StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 20 },
  label: { fontSize: 14, color: "#333", marginBottom: 4 },
  barBackground: {
    height: 16,
    backgroundColor: "#e0e0e0",
    borderRadius: 8,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 25,
    paddingHorizontal: 5,
  },
  dropdownBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: -15,
  },
  dropdownText: {
    color: PALETTE.darkGreen,
    fontSize: 14,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "75%",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 10,
  },
  modalItem: {
    paddingVertical: 10,
    alignItems: "center",
  },
  chart: {
    marginVertical: 15,
    borderRadius: 10,
    marginLeft: -20,
    marginRight: 10,
  },
  noData: {
    marginTop: 30,
    textAlign: "center",
    color: "#777",
  },
  progressBarContainer: {
    width: "100%",
    height: 14,
    backgroundColor: "#E0E0E0",
    borderRadius: 10,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
  },
  chart: {
    marginHorizontal: 10,
    borderRadius: 16,
    marginLeft: -5,
  },
  cancelButton: {
    color: "red", 
    textAlign: "center", 
    padding: 8 
  },
  progressPercent: {
    fontSize: 12,
    color: '#868686ff',
    fontWeight: '500',
  }
});
