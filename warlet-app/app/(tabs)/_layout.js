import React, { useState, useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { supabase } from "../../lib/supabase";
import HomeScreen from "./home/home";
import SettingScreen from "./setting/setting";
import GroupScreen from "./home/group";
import CreateGroupScreen from "./home/create-group";
import ChatScreen from "./home/chat";
import EventScreen from "./home/event";
import AddReceiptScreen from "./home/add-receipt";
import AddReceiptAdvancedScreen from "./home/add-receipt-advanced";
import ReceiptDetailScreen from "./home/receipt-detail";
import CreateEventScreen from "./home/create-event";
import ProfileSettingScreen from "./setting/profile";
import ProfileEditScreen from "./setting/edit-profile";
import PaymentSettingScreen from "./setting/payment-setting";
import PaymentMenuScreen from "./setting/payment-menu";
import JoinGroupScreen from "./home/join-group-code";
import PaymentOverviewScreen from "./setting/payment-overview";
import DeleteAccountScreen from "./setting/delete-account";
import LoginScreen from "../(auth)/login";
import { View, ActivityIndicator } from "react-native";
import Icon1 from "react-native-vector-icons/MaterialCommunityIcons";
import Icon2 from "react-native-vector-icons/FontAwesome5";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HomeStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#3d547f" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        headerBackTitleVisible: false,
        headerBackTitle: "",
      }}
    >
      <Stack.Screen
        name="ホーム"
        component={HomeScreen}
        options={{
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name="group"
        component={GroupScreen}
        options={{ title: "グループ" }}
      />
      <Stack.Screen
        name="create-group"
        component={CreateGroupScreen}
        options={{ title: "グループ作成" }}
      />
      <Stack.Screen
        name="chat"
        component={ChatScreen}
        options={{ title: "チャット" }}
      />
      <Stack.Screen
        name="event"
        component={EventScreen}
        options={{ title: "イベント" }}
      />
      <Stack.Screen
        name="addreceipt"
        component={AddReceiptScreen}
        options={{ title: "簡単割り勘追加" }}
      />
      <Stack.Screen
        name="addreceiptadvanced"
        component={AddReceiptAdvancedScreen}
        options={{ title: "詳細割り勘追加" }}
      />
      <Stack.Screen
        name="receipt-detail"
        component={ReceiptDetailScreen}
        options={{ title: "レシート詳細" }}
      />
      <Stack.Screen
        name="create-event"
        component={CreateEventScreen}
        options={{ title: "イベント作成" }}
      />
      <Stack.Screen
        name="join-group-code"
        component={JoinGroupScreen}
        options={{ title: "グループ参加" }}
      />
    </Stack.Navigator>
  );
}

function PaymentStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#3d547f" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        headerBackTitleVisible: false,
        headerBackTitle: "",
      }}
    >
      <Stack.Screen
        name="送金"
        component={PaymentMenuScreen}
        options={{
          title: "送金",
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name="payment-overview"
        component={PaymentOverviewScreen}
        options={{ title: "支払い詳細" }}
      />
    </Stack.Navigator>
  );
}

function SettingStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#3d547f" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        headerBackTitleVisible: false,
        headerBackTitle: "",
      }}
    >
      <Stack.Screen
        name="設定"
        component={SettingScreen}
        options={{ headerLeft: () => null }}
      />
      <Stack.Screen
        name="profile"
        component={ProfileSettingScreen}
        options={{ title: "プロフィール" }}
      />
      <Stack.Screen
        name="edit-profile"
        component={ProfileEditScreen}
        options={{ title: "プロフィール編集" }}
      />
      <Stack.Screen
        name="payment"
        component={PaymentSettingScreen}
        options={{ title: "支払い設定" }}
      />
      <Stack.Screen
        name="delete-account"
        component={DeleteAccountScreen}
        options={{ title: "アカウント削除" }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return user ? (
    <Tab.Navigator
      screenOptions={{
        headerLeft: () => null,
        gestureEnabled: false,
        tabBarStyle: { backgroundColor: "#3d547f" },
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "#ccc",
      }}
    >
      <Tab.Screen
        name="ホーム"
        component={HomeStackNavigator}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Icon1 name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="送金"
        component={PaymentStackNavigator}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Icon2 name="money-bill" color={color} size={size - 5} />
          ),
        }}
      />
      <Tab.Screen
        name="設定"
        component={SettingStackNavigator}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Icon1 name="account-settings" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  ) : (
    <LoginScreen />
  );
}
