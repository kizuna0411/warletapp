import React, { useEffect } from "react";
import { Linking } from "react-native";
import { Stack } from "expo-router";
import { useNavigation } from "@react-navigation/native";

export default function Layout() {
  const navigation = useNavigation();

  useEffect(() => {
    const handleDeepLink = (event) => {
      const url = event.url;

      if (url.includes("reset-password")) {
        navigation.navigate("reset-pass");
      }
    };

    const subscription = Linking.addEventListener("url", handleDeepLink);

    return () => subscription.remove();
  }, [navigation]);

  return (
    <Stack
      screenOptions={{
        headerLeft: () => null,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen
        name="(tabs)"
        options={{ gestureEnabled: false, headerShown: false }}
      />
    </Stack>
  );
}
