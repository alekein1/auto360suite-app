import { useEffect, useRef } from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as SecureStore from "expo-secure-store";

import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen"; 
import AdminStack from "./AdminStack";
import IdentificacionStack from "./IdentificacionStack";
import AutoServicioStack from "./AutoServicioStack";
import LegalizacionStack from "./LegalizacionStack";
import {
  extractNotificationNavigationPayload,
  isPushNotificationsRuntimeEnabled,
  registerDeviceForPushNotifications,
} from "../services/pushNotifications";

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();
const Notifications = isPushNotificationsRuntimeEnabled()
  ? require("expo-notifications")
  : null;

export default function AppNavigator() {
  const pendingNavigationRef = useRef(null);
  const lastNotificationIdRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const openNotification = async (response) => {
      const payload = extractNotificationNavigationPayload(response);

      if (!payload) {
        return;
      }

      if (
        payload.identifier &&
        payload.identifier === lastNotificationIdRef.current
      ) {
        return;
      }

      const storedToken = await SecureStore.getItemAsync("token");
      const storedUser = await SecureStore.getItemAsync("usuario");

      if (!storedToken || !storedUser) {
        return;
      }

      lastNotificationIdRef.current = payload.identifier;
      pendingNavigationRef.current = payload;

      if (navigationRef.isReady()) {
        navigationRef.navigate(payload.rootStack, {
          screen: payload.screen,
          params: payload.params,
        });
        pendingNavigationRef.current = null;
      }
    };

    registerDeviceForPushNotifications().catch(() => {});

    if (!Notifications) {
      return () => {
        mounted = false;
      };
    }

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        openNotification(response).catch((error) => {
          console.log("Push navigation warning:", error.message);
        });
      });

    const lastNotificationResponsePromise =
      typeof Notifications.getLastNotificationResponseAsync === "function"
        ? Notifications.getLastNotificationResponseAsync()
        : Promise.resolve(null);

    lastNotificationResponsePromise
      .then((response) => {
        if (mounted && response) {
          return openNotification(response);
        }
        return null;
      })
      .catch((error) => {
        console.log("Push bootstrap warning:", error.message);
      });

    return () => {
      mounted = false;
      responseSubscription.remove();
    };
  }, []);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        const pending = pendingNavigationRef.current;

        if (!pending) {
          return;
        }

        navigationRef.navigate(pending.rootStack, {
          screen: pending.screen,
          params: pending.params,
        });

        pendingNavigationRef.current = null;
      }}
    >
      <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>

        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />

        {/* ADMIN */}
        <Stack.Screen name="Admin" component={AdminStack} />
        <Stack.Screen 
  name="Identificacion" 
  component={IdentificacionStack} 
/>
<Stack.Screen 
  name="AutoServicio" 
  component={AutoServicioStack} 
/>
<Stack.Screen
  name="Legalizacion"
  component={LegalizacionStack}
/>

        {/* Usuario común */}
        <Stack.Screen name="Home" component={HomeScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
