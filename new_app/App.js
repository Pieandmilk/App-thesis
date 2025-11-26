import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { UserProvider } from "./UserContext";
import { StyleSheet } from "react-native";

import Register from "./screens/RegisterScreen";
import Login from "./screens/LoginScreen";
import Form from "./screens/FormScreen";
import Main from "./screens/MainScreen";
import StartupScreen from "./screens/StartUpScreen";
import AboutScreen from "./screens/AboutScreen";
import PrivacyPolicyScreen from "./screens/PrivacyPolicyScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <UserProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Startup"
              screenOptions={{ headerShown: false }}
            >
              <Stack.Screen name="Startup" component={StartupScreen} />
              <Stack.Screen name="Login" component={Login}/>
              <Stack.Screen name="Register" component={Register}/>
              <Stack.Screen name="Form" component={Form}/>
              <Stack.Screen name="Main" component={Main}/>
              <Stack.Screen name="About" component={AboutScreen} />
              <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </UserProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
