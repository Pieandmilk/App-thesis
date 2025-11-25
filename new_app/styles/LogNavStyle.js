import { StyleSheet } from "react-native";

export default StyleSheet.create({
  calendarTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e7d32', marginBottom: 10, textAlign: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', marginVertical: 10, color: '#145a32', textAlign: 'center' },
  timeHeader: { fontSize: 16, fontWeight: 'bold', marginVertical: 5, color: '#1e7d32' },
  
  // Meal Card Styles
  mealCard: {
    backgroundColor: "#eaf6ea",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  mealHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: 8 
  },
  mealName: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#27ae60" 
  },
  mealCalories: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#2c3e50" 
  },
  macrosRow: { 
    flexDirection: "row", 
    justifyContent: "space-between" 
  },
  macroText: { 
    fontSize: 12, 
    color: "#34495e", 
    fontWeight: "500" 
  },
  
  // Calendar Styles
  calendarStrip: {
    height: 100,
    minHeight: 100,
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: 20,
  },
  calendarHeader: { 
    color: "#ffffff", 
    fontSize: 18, 
    fontWeight: "600" 
  },
  dateNumber: { 
    color: "#fff", 
    fontSize: 16 
  },
  dateName: { 
    color: "#fff", 
    fontSize: 12 
  },
  highlightDateNumber: { 
    color: "#ffffff", 
    fontSize: 18, 
    fontWeight: "bold" 
  },
  highlightDateName: { 
    color: "#ffffff", 
    fontSize: 12, 
    fontWeight: "600" 
  },
  
  // Markdown Styles
  markdownBody: { 
    fontSize: 14, 
    color: "#333", 
    lineHeight: 20 
  },
  markdownHeading1: { 
    fontSize: 18, 
    fontWeight: "bold", 
    color: "#27ae60" 
  },
  markdownHeading2: { 
    fontSize: 16, 
    fontWeight: "bold", 
    color: "#27ae60" 
  },
  markdownStrong: { 
    fontWeight: "bold", 
    color: "#d35400" 
  },
  markdownListItem: { 
    marginBottom: 3 
  },
  
  // Empty State
  emptyContainer: { 
    padding: 20, 
    alignItems: 'center', 
    marginVertical: 20 
  },
  emptyText: { 
    color: '#145a32', 
    fontStyle: 'italic' 
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#eafaf1',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 15, 
    color: '#1e7d32', 
    textAlign: 'center' 
  },
  
  // Button Styles
  closeButton: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#27ae60',
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#c0392b',
  },
  closeText: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  
  // Food Log Styles
  foodItem: { 
    paddingVertical: 8, 
    borderBottomWidth: 1, 
    borderColor: '#d4f1d4' 
  },
  foodName: { 
    fontWeight: 'bold', 
    fontSize: 14, 
    color: '#145a32' 
  },
  foodMacros: { 
    fontSize: 12, 
    color: '#145a32', 
    marginTop: 2 
  },
  
  // Text Styles
  select: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#145a32', 
    textAlign: 'center', 
    marginVertical: 10,
  },
  
  // Loading Styles
  loadingContainer: { 
    marginTop: 30, 
    alignItems: "center" 
  },
  recLoadingContainer: { 
    marginTop: 50, 
    alignItems: "center" 
  },
  loadingText: { 
    marginTop: 10, 
    fontSize: 16 
  },
  
  // Close Icon Styles
  closeIcon: {
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
  },
  closeIconText: { 
    fontSize: 22, 
    fontWeight: "bold", 
    color: "#c0392b" 
  },
  
  // Scroll View Styles
  recommendationScroll: { 
    marginTop: 40, 
    maxHeight: "80%" 
  },
})
