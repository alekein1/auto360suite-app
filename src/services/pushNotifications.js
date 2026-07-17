import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as SecureStore from "expo-secure-store";

const API_URL = "https://api360suite.pqautoexpert.ec/api";
const PUSH_TOKEN_KEY = "expo_push_token";
const ORDER_CHANNEL_ID = "ordenes";

function isExpoGoRuntime() {
  return (
    Constants?.executionEnvironment === ExecutionEnvironment.StoreClient ||
    Constants?.appOwnership === "expo"
  );
}

export function isPushNotificationsRuntimeEnabled() {
  if (Platform.OS === "android" && isExpoGoRuntime()) {
    return false;
  }

  return true;
}

const Notifications = isPushNotificationsRuntimeEnabled()
  ? require("expo-notifications")
  : null;

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android" || !Notifications) {
    return;
  }

  await Notifications.setNotificationChannelAsync(ORDER_CHANNEL_ID, {
    name: "Ordenes",
    description: "Alertas de nuevas ordenes asignadas",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#111d4d",
    sound: "default",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

function getProjectId() {
  return (
    Constants?.easConfig?.projectId ||
    Constants?.expoConfig?.extra?.eas?.projectId ||
    null
  );
}

async function getAuthToken(explicitToken) {
  return explicitToken || SecureStore.getItemAsync("token");
}

async function postPushRegistration(path, authToken, body) {
  const response = await fetch(`${API_URL}/mobile/push/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = "No se pudo sincronizar notificaciones push";

    try {
      const data = await response.json();
      message = data?.error || message;
    } catch {}

    throw new Error(message);
  }

  return response.json().catch(() => null);
}

export async function registerDeviceForPushNotifications(explicitToken) {
  const authToken = await getAuthToken(explicitToken);

  if (!authToken) {
    return { ok: false, reason: "missing-auth-token" };
  }

  if (!isPushNotificationsRuntimeEnabled() || !Notifications) {
    return { ok: false, reason: "expo-go-android-unsupported" };
  }

  if (!Device.isDevice) {
    return { ok: false, reason: "physical-device-required" };
  }

  await ensureAndroidChannel();

  const currentPermissions = await Notifications.getPermissionsAsync();
  let finalStatus = currentPermissions.status;

  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    finalStatus = requested.status;
  }

  if (finalStatus !== "granted") {
    return { ok: false, reason: "permission-denied" };
  }

  const projectId = getProjectId();

  if (!projectId) {
    throw new Error("No se encontró el projectId de EAS para push.");
  }

  const expoPushToken = (
    await Notifications.getExpoPushTokenAsync({ projectId })
  ).data;

  await postPushRegistration("register", authToken, {
    expo_push_token: expoPushToken,
    platform: Platform.OS,
    device_name: Device.deviceName || null,
    device_model: Device.modelName || null,
    app_version:
      Constants?.expoConfig?.version || Constants?.nativeAppVersion || null,
  });

  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, expoPushToken);

  return { ok: true, expoPushToken };
}

export async function unregisterDevicePushNotifications(explicitToken) {
  const authToken = await getAuthToken(explicitToken);
  const storedPushToken = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);

  if (!authToken || !storedPushToken) {
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
    return { ok: false, reason: "nothing-to-unregister" };
  }

  await postPushRegistration("unregister", authToken, {
    expo_push_token: storedPushToken,
  });

  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);

  return { ok: true };
}

export function extractNotificationNavigationPayload(response) {
  const data = response?.notification?.request?.content?.data;

  if (!data || typeof data !== "object") {
    return null;
  }

  const rootStack = data.root_stack;
  const screen = data.screen;
  const idOrden = Number(data.id_orden);

  if (!rootStack || !screen) {
    return null;
  }

  return {
    identifier: response?.notification?.request?.identifier || null,
    rootStack,
    screen,
    params:
      Number.isFinite(idOrden) && idOrden > 0 ? { id_orden: idOrden } : undefined,
  };
}
