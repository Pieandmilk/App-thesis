import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BACKEND_URL = "http://192.168.0.101:8000";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);
  const [mealRefreshCounter, setMealRefreshCounter] = useState(0);
  const [isLoadingUser, setIsLoadingUser] = useState(true); 
  
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem("userId");
        if (storedUserId) {
          setUserId(storedUserId);
        }
      } catch (error) {
        console.error("Error loading userId from storage:", error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadUserId();
  }, []);

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("userId");
      setUserId(null);
    } catch (error) {
      console.error("Error clearing user data:", error);
    }
  };

  const triggerMealRefresh = () => {
    setMealRefreshCounter((prev) => prev + 1);
  };

  return (
    <UserContext.Provider
      value={{
        userId,
        setUserId,
        mealRefreshCounter,
        setMealRefreshCounter,
        triggerMealRefresh,
        BACKEND_URL,
        isLoadingUser,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
