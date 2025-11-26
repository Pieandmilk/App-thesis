import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BACKEND_URL = "https://oversteadily-unengendered-bonny.ngrok-free.dev";

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
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
