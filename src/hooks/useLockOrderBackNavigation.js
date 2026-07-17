import { useCallback } from "react";
import { BackHandler, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

export default function useLockOrderBackNavigation() {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") {
        return undefined;
      }

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true
      );

      return () => {
        subscription.remove();
      };
    }, [])
  );
}
