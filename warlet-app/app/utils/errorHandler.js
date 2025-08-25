/**
 * グローバルエラーハンドリングユーティリティ
 * React Native + Hermes 環境での例外処理強化
 * iOS 18 + TestFlight クラッシュ対策
 */

import { Alert } from "react-native";

// エラーのタイプ分類
export const ErrorTypes = {
  NETWORK: "NETWORK",
  AUTH: "AUTH",
  DATABASE: "DATABASE",
  VALIDATION: "VALIDATION",
  PERMISSION: "PERMISSION",
  NATIVE_MODULE: "NATIVE_MODULE",
  JS_BRIDGE: "JS_BRIDGE",
  HERMES: "HERMES",
  UNKNOWN: "UNKNOWN",
};

// Hermes環境検出
const isHermesEngine = () => {
  return global.HermesInternal != null;
};

// TestFlight環境検出
const isTestFlightBuild = () => {
  return __DEV__ === false && !global.__EXPO_DEV__;
};

// 詳細なエラーログ収集
const collectErrorDetails = (error, isFatal = false) => {
  const details = {
    timestamp: new Date().toISOString(),
    isHermes: isHermesEngine(),
    isTestFlight: isTestFlightBuild(),
    isFatal,
    error: {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      cause: error?.cause,
    },
    jsEngine: global.HermesInternal ? "Hermes" : "JSC",
    platform: "ios",
  };

  // Hermesの詳細情報を追加
  if (global.HermesInternal) {
    try {
      details.hermesVersion =
        global.HermesInternal.getRuntimeProperties?.()?.["OSS Release Version"];
      details.hermesFeatures = Object.keys(global.HermesInternal);
    } catch (hermesError) {
      details.hermesError = hermesError.message;
    }
  }

  return details;
};

// エラー分類関数
export const classifyError = (error) => {
  if (!error) {
    return ErrorTypes.UNKNOWN;
  }

  const message = error.message || "";
  const code = error.code || "";
  const stack = error.stack || "";

  // ネイティブモジュールエラー
  if (
    message.includes("Native module") ||
    message.includes("NativeModules") ||
    message.includes("RCTBridge") ||
    stack.includes("Native") ||
    code === "NATIVE_MODULE_ERROR"
  ) {
    return ErrorTypes.NATIVE_MODULE;
  }

  // JSブリッジエラー
  if (
    message.includes("bridge") ||
    message.includes("RCT") ||
    message.includes("Metro") ||
    stack.includes("Bridge") ||
    code === "JS_BRIDGE_ERROR"
  ) {
    return ErrorTypes.JS_BRIDGE;
  }

  // Hermesエンジンエラー
  if (
    message.includes("Hermes") ||
    message.includes("VM") ||
    message.includes("bytecode") ||
    stack.includes("Hermes")
  ) {
    return ErrorTypes.HERMES;
  }

  // ネットワークエラー
  if (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    code === "NETWORK_ERROR"
  ) {
    return ErrorTypes.NETWORK;
  }

  // 認証エラー
  if (
    error.status === 401 ||
    message.includes("unauthorized") ||
    message.includes("auth") ||
    code === "AUTH_ERROR"
  ) {
    return ErrorTypes.AUTH;
  }

  // データベースエラー
  if (
    code?.startsWith("PGRST") ||
    message.includes("database") ||
    message.includes("supabase")
  ) {
    return ErrorTypes.DATABASE;
  }

  // バリデーションエラー
  if (
    message.includes("validation") ||
    message.includes("invalid") ||
    message.includes("required")
  ) {
    return ErrorTypes.VALIDATION;
  }

  // 権限エラー
  if (
    error.status === 403 ||
    message.includes("permission") ||
    message.includes("forbidden")
  ) {
    return ErrorTypes.PERMISSION;
  }

  return ErrorTypes.UNKNOWN;
};

// ユーザー向けエラーメッセージの生成
export const getUserFriendlyMessage = (error, errorType = null) => {
  const type = errorType || classifyError(error);

  switch (type) {
    case ErrorTypes.NETWORK:
      return "ネットワーク接続に問題があります。接続を確認して再試行してください。";

    case ErrorTypes.AUTH:
      return "ログインが必要です。再度ログインしてください。";

    case ErrorTypes.DATABASE:
      return "データの取得に失敗しました。しばらく待ってから再試行してください。";

    case ErrorTypes.VALIDATION:
      return "入力された情報に問題があります。内容を確認してください。";

    case ErrorTypes.PERMISSION:
      return "この操作を行う権限がありません。";

    default:
      return "予期しないエラーが発生しました。アプリを再起動してください。";
  }
};

// エラーログの詳細記録
export const logError = (error, context = "", additionalInfo = {}) => {
  const timestamp = new Date().toISOString();
  const errorType = classifyError(error);

  const logData = {
    timestamp,
    context,
    errorType,
    message: error?.message || "Unknown error",
    stack: error?.stack || "No stack trace",
    code: error?.code || "NO_CODE",
    status: error?.status || "NO_STATUS",
    additionalInfo,
    userAgent: global.navigator?.userAgent || "Unknown",
    platform: global.Platform?.OS || "Unknown",
  };

  console.error("🚨 [Error Handler]", logData);

  // 本番環境では外部ログサービスに送信することを推奨
  //例: Sentry, LogRocket, Firebase Crashlytics など

  return logData;
};

// 統合エラーハンドラー
export const handleError = (
  error,
  context = "",
  showAlert = true,
  additionalInfo = {}
) => {
  // エラーログの記録
  const logData = logError(error, context, additionalInfo);

  // ユーザーへの通知
  if (showAlert) {
    const userMessage = getUserFriendlyMessage(error, logData.errorType);

    Alert.alert(
      "エラー",
      userMessage,
      [
        {
          text: "OK",
          style: "default",
        },
      ],
      { cancelable: true }
    );
  }

  return logData;
};

// 非同期関数のラッパー
export const withErrorHandling = (asyncFunction, context = "") => {
  return async (...args) => {
    try {
      return await asyncFunction(...args);
    } catch (error) {
      handleError(error, `${context} - ${asyncFunction.name}`);
      throw error; // 必要に応じて再スロー
    }
  };
};

// Promise のラッパー
export const safePromise = (promise, context = "") => {
  return promise.catch((error) => {
    handleError(error, context, false); // Alertは表示しない
    return null; // デフォルト値を返す
  });
};

// React Native 特有のエラーハンドリング設定
export const setupGlobalErrorHandling = () => {
  // JavaScript エラーの全般的なキャッチ
  if (global.ErrorUtils) {
    const originalGlobalHandler = global.ErrorUtils.getGlobalHandler();

    global.ErrorUtils.setGlobalHandler((error, isFatal) => {
      logError(error, "Global Error Handler", { isFatal });

      if (isFatal) {
        console.error("💀 Fatal error detected - App will crash:", error);

        // クリティカルエラーの場合は外部サービスに緊急通知
        // 例: crash reporting service
      }

      // 元のハンドラーも呼び出す
      if (originalGlobalHandler) {
        originalGlobalHandler(error, isFatal);
      }
    });
  }

  // Promise rejection のハンドリング
  if (global.process && typeof global.process.on === "function") {
    global.process.on("unhandledRejection", (reason, promise) => {
      const error =
        reason instanceof Error ? reason : new Error(String(reason));
      logError(error, "Unhandled Promise Rejection", {
        promise: promise.toString(),
      });
    });
  }

  // Console エラーもキャッチ
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // 重要なエラーパターンをフィルタリング
    const message = args.join(" ");
    if (message.includes("Warning:") || message.includes("[YellowBox]")) {
      // React Native の警告は除外
      originalConsoleError(...args);
      return;
    }

    // エラーログとして記録
    if (args[0] instanceof Error) {
      logError(args[0], "Console Error", { additionalArgs: args.slice(1) });
    } else {
      logError(new Error(message), "Console Error");
    }

    // 元の console.error も実行
    originalConsoleError(...args);
  };

  console.log("✅ Global error handling setup completed");
};

export default {
  ErrorTypes,
  classifyError,
  getUserFriendlyMessage,
  logError,
  handleError,
  withErrorHandling,
  safePromise,
  setupGlobalErrorHandling,
  collectErrorDetails,
};
