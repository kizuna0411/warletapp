import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import LoginScreen from "./login";
import SignupScreen from "./signup";
import { Image, Text, View } from "react-native";

const Stack = createStackNavigator();

export default function AuthStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#3d547f",
        },
      }}
    >
      <Stack.Screen
        name="login"
        component={LoginScreen}
        options={{
          headerShown: false,
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name="signup"
        component={SignupScreen}
        options={{
          headerShown: false,
          headerLeft: () => null,
        }}
      />
    </Stack.Navigator>
  );
}
