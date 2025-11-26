import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import HomeNav from '../navbar/HomeNav';
import LogNav from '../navbar/LogNav';
import ResultNav from '../navbar/ResultNav';
import SettingNav from '../navbar/SettingNav';
import RecommendationNav from '../navbar/RecommendationNav';

import { useUser } from "../UserContext";

const Tab = createBottomTabNavigator();

export default function Main() {
  const { userId, BACKEND_URL } = useUser();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: 'green',
        tabBarInactiveTintColor: '#7e7e7eff',
        tabBarStyle: {
          height: 60,
          paddingBottom: 5,
          paddingTop: 5,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          backgroundColor: '#fff',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        options={{
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={28} color={color} />,
        }}
      >
        {() => <HomeNav userId={userId} BACKEND_URL={BACKEND_URL} />}
      </Tab.Screen>

      <Tab.Screen
        name="Log"
        options={{
          tabBarIcon: ({ color }) => <MaterialIcons name="calendar-today" size={28} color={color} />,
        }}
      >
        {() => <LogNav userId={userId} BACKEND_URL={BACKEND_URL} />}
      </Tab.Screen>

      <Tab.Screen
        name="Recommendation"
        options={{
          tabBarIcon: ({ color }) => <MaterialIcons name="lightbulb" size={28} color={color} />,
        }}
      >
        {() => <RecommendationNav userId={userId} BACKEND_URL={BACKEND_URL} />}
      </Tab.Screen>

      <Tab.Screen
        name="Camera"
        options={{
          tabBarIcon: ({ color }) => <MaterialIcons name="photo-camera" size={28} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: async (e) => {
            e.preventDefault();

            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              alert('Camera permission is required!');
              return;
            }

            const result = await ImagePicker.launchCameraAsync({ quality: 1 });
            if (!result.canceled) {
              navigation.navigate('Food Result', { photoUri: result.assets[0].uri });
            }
          },
        })}
      >
        {() => <HomeNav userId={userId} BACKEND_URL={BACKEND_URL} />}
      </Tab.Screen>

      <Tab.Screen
        name="Food Result"
        options={{
          tabBarIcon: ({ color }) => <MaterialIcons name="restaurant" size={28} color={color} />,
        }}
      >
        {({ route }) => (
          <ResultNav
            photoUri={route.params?.photoUri}
            userId={userId}
            BACKEND_URL={BACKEND_URL}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Settings"
        options={{
          tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={28} color={color} />,
        }}
      >
        {() => <SettingNav/>}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
