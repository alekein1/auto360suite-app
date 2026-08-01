import { useEffect, useRef } from "react";
import {
  CommonActions,
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as SecureStore from "expo-secure-store";

import WelcomeScreen from "../screens/WelcomeScreen";
import {
  extractNotificationNavigationPayload,
  isPushNotificationsRuntimeEnabled,
} from "../services/pushNotifications";
import { resolveRootRouteForUser } from "../utils/sessionRouting";

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();
const Notifications = isPushNotificationsRuntimeEnabled()
  ? require("expo-notifications")
  : null;

export default function AppNavigator() {
  const pendingNavigationRef = useRef(null);
  const lastNotificationIdRef = useRef(null);
  const pendingSessionRouteRef = useRef(null);

  const replaceRootRoute = (routeName) => {
    if (!routeName) {
      return;
    }

    if (!navigationRef.isReady()) {
      pendingSessionRouteRef.current = routeName;
      return;
    }

    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: routeName }],
      })
    );
  };

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      const [storedToken, storedUser] = await Promise.all([
        SecureStore.getItemAsync("token"),
        SecureStore.getItemAsync("usuario"),
      ]);

      if (!mounted || !storedToken || !storedUser) {
        return;
      }

      const user = JSON.parse(storedUser);
      replaceRootRoute(resolveRootRouteForUser(user));
    };

    restoreSession().catch((error) => {
      console.log("Session restore warning:", error.message);
    });

    return () => {
      mounted = false;
    };
  }, []);

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
        const sessionRoute = pendingSessionRouteRef.current;

        if (sessionRoute) {
          pendingSessionRouteRef.current = null;
          replaceRootRoute(sessionRoute);
          return;
        }

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
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen
          name="Login"
          getComponent={() => require("../screens/LoginScreen").default}
        />

        {/* ADMIN */}
        <Stack.Screen
          name="Admin"
          getComponent={() => require("./AdminStack").default}
        />
        <Stack.Screen
          name="Identificacion"
          getComponent={() => require("./IdentificacionStack").default}
        />
        <Stack.Screen
          name="AutoServicio"
          getComponent={() => require("./AutoServicioStack").default}
        />
        <Stack.Screen
          name="Legalizacion"
          getComponent={() => require("./LegalizacionStack").default}
        />

        {/* Usuario común */}
        <Stack.Screen
          name="Home"
          getComponent={() => require("../screens/HomeScreen").default}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
