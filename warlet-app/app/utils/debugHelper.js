/**
 * クラッシュログ対応のテスト用ユーティリティ
 * TestFlight環境でのエラー再現とデバッグ支援
 */

import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { supabase } from "../../lib/supabase";
import { handleError, logError } from "./errorHandler";

// TestFlight環境の検出
export const isTestFlightBuild = () => {
  // TestFlightのビルドの場合、特定の環境変数やBundle IDで判定
  return process.env.NODE_ENV === "production" && __DEV__ === false;
};

// iOS 18環境の検出
export const isIOS18OrLater = () => {
  if (Platform.OS !== "ios") {
    return false;
  }

  const version = Platform.Version;
  return typeof version === "string"
    ? parseInt(version.split(".")[0]) >= 18
    : version >= 18;
};

// Hermes エンジンの検出
export const isHermesEnabled = () => {
  return typeof HermesInternal === "object" && HermesInternal !== null;
};

// 環境情報の収集
export const getEnvironmentInfo = () => {
  const info = {
    platform: Platform.OS,
    platformVersion: Platform.Version,
    isTestFlight: isTestFlightBuild(),
    isIOS18: isIOS18OrLater(),
    isHermes: isHermesEnabled(),
    timestamp: new Date().toISOString(),
    appVersion: Constants.manifest?.version || "Unknown",
    expoVersion: Constants.expoVersion || "Unknown",
  };

  console.log("📱 Environment Info:", info);
  return info;
};

// 重要な処理での事前チェック
export const performSystemChecks = async () => {
  const checks = {
    supabaseConnection: false,
    asyncStorageAccess: false,
    authService: false,
    networkConnection: false,
  };

  try {
    // Supabase接続チェック
    if (supabase) {
      const { data, error } = await supabase.auth.getSession();
      checks.supabaseConnection = !error;
    }
  } catch (error) {
    logError(error, "System Check - Supabase");
  }

  try {
    // AsyncStorage チェック
    const testKey = "system_check_test";
    await AsyncStorage.setItem(testKey, "test");
    const testValue = await AsyncStorage.getItem(testKey);
    await AsyncStorage.removeItem(testKey);
    checks.asyncStorageAccess = testValue === "test";
  } catch (error) {
    logError(error, "System Check - AsyncStorage");
  }

  try {
    // ネットワーク接続チェック（簡易）
    const response = await fetch("https://www.google.com/favicon.ico", {
      method: "HEAD",
      cache: "no-cache",
    });
    checks.networkConnection = response.ok;
  } catch (error) {
    logError(error, "System Check - Network");
  }

  console.log("🔍 System Checks:", checks);
  return checks;
};

// クラッシュ再現テスト（開発用）
export const performCrashTests = () => {
  if (process.env.NODE_ENV === "production") {
    console.warn("Crash tests are disabled in production");
    return;
  }

  Alert.alert("クラッシュテスト", "どのタイプのエラーをテストしますか？", [
    {
      text: "キャンセル",
      style: "cancel",
    },
    {
      text: "Promise Rejection",
      onPress: () => {
        Promise.reject(new Error("Test Promise Rejection"));
      },
    },
    {
      text: "Throw Error",
      onPress: () => {
        throw new Error("Test Thrown Error");
      },
    },
    {
      text: "Supabase Error",
      onPress: async () => {
        try {
          await supabase.from("non_existent_table").select("*");
        } catch (error) {
          handleError(error, "Crash Test - Supabase");
        }
      },
    },
    {
      text: "Native Module Error",
      onPress: () => {
        // 不正な Native モジュール呼び出し
        const { NativeModules } = require("react-native");
        try {
          NativeModules.SomeNonExistentModule.someMethod();
        } catch (error) {
          handleError(error, "Crash Test - Native Module");
        }
      },
    },
  ]);
};

// デバッグ情報の収集と表示
export const collectDebugInfo = async () => {
  try {
    const envInfo = getEnvironmentInfo();
    const systemChecks = await performSystemChecks();

    const debugInfo = {
      environment: envInfo,
      systemChecks,
      memoryUsage: performance.memory
        ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
          }
        : "Not available",
      timestamp: new Date().toISOString(),
    };

    console.log("🐛 Debug Info:", debugInfo);

    // 開発環境ではアラートで表示
    if (__DEV__) {
      Alert.alert(
        "デバッグ情報",
        `環境: ${envInfo.platform} ${envInfo.platformVersion}\n` +
          `TestFlight: ${envInfo.isTestFlight}\n` +
          `iOS 18+: ${envInfo.isIOS18}\n` +
          `Hermes: ${envInfo.isHermes}\n` +
          `Supabase: ${systemChecks.supabaseConnection ? "✅" : "❌"}\n` +
          `AsyncStorage: ${systemChecks.asyncStorageAccess ? "✅" : "❌"}\n` +
          `Network: ${systemChecks.networkConnection ? "✅" : "❌"}`,
        [{ text: "OK" }]
      );
    }

    return debugInfo;
  } catch (error) {
    handleError(error, "Debug Info Collection");
    return null;
  }
};

export default {
  isTestFlightBuild,
  isIOS18OrLater,
  isHermesEnabled,
  getEnvironmentInfo,
  performSystemChecks,
  performCrashTests,
  collectDebugInfo,
};
