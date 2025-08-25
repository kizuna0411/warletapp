/**
 * ネイティブモジュール初期化管理
 * React Native + Hermes 環境でのクラッシュ対策
 *
 * 参考: Reddit discussion on TestFlight SIGABRT crashes
 * 解決策: JSブリッジの完全初期化後にネイティブモジュールを呼び出す
 */

import { NativeModules, NativeEventEmitter } from "react-native";

class NativeModuleManager {
  constructor() {
    this.isJSBridgeReady = false;
    this.pendingInitializations = [];
    this.initializationPromise = null;
    this.maxWaitTime = 10000; // 10秒のタイムアウト
  }

  /**
   * JSブリッジの準備完了を待つ
   */
  async waitForJSBridge() {
    if (this.isJSBridgeReady) {
      return true;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.warn("⚠️ JS Bridge initialization timeout");
        reject(new Error("JS Bridge initialization timeout"));
      }, this.maxWaitTime);

      // JSブリッジの準備状態をチェック
      const checkBridgeReady = () => {
        try {
          // React Native bridge の基本的な機能をテスト
          const testModule =
            NativeModules.StatusBarManager || NativeModules.PlatformConstants;

          if (testModule) {
            clearTimeout(timeout);
            this.isJSBridgeReady = true;
            console.log("✅ JS Bridge is ready");
            resolve(true);
            return;
          }
        } catch (error) {
          console.log("JS Bridge not ready yet:", error.message);
        }

        // 100ms後に再チェック
        setTimeout(checkBridgeReady, 100);
      };

      // 即座にチェック開始
      checkBridgeReady();
    });

    return this.initializationPromise;
  }

  /**
   * 安全なネイティブモジュール初期化
   */
  async safeNativeModuleInit(moduleName, initFunction) {
    try {
      console.log(`🔄 Initializing native module: ${moduleName}`);

      // JSブリッジの準備を待つ
      await this.waitForJSBridge();

      // 少し追加で待機（保険）
      await new Promise((resolve) => setTimeout(resolve, 100));

      // モジュール初期化実行
      const result = await initFunction();

      console.log(`✅ Native module initialized: ${moduleName}`);
      return result;
    } catch (error) {
      console.error(
        `❌ Failed to initialize native module ${moduleName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * ネイティブモジュールの存在確認
   */
  checkNativeModule(moduleName) {
    try {
      const module = NativeModules[moduleName];
      if (!module) {
        console.warn(`⚠️ Native module not found: ${moduleName}`);
        return false;
      }

      console.log(`✅ Native module available: ${moduleName}`);
      return true;
    } catch (error) {
      console.error(`❌ Error checking native module ${moduleName}:`, error);
      return false;
    }
  }

  /**
   * 複数のネイティブモジュールを順次初期化
   */
  async initializeModules(moduleConfigs) {
    const results = {};

    for (const { name, initFunction, required = false } of moduleConfigs) {
      try {
        results[name] = await this.safeNativeModuleInit(name, initFunction);
      } catch (error) {
        results[name] = { error: error.message };

        if (required) {
          throw new Error(
            `Required native module ${name} failed to initialize: ${error.message}`
          );
        }
      }
    }

    return results;
  }

  /**
   * Hermesエンジンの状態確認
   */
  checkHermesStatus() {
    const status = {
      isHermes: global.HermesInternal != null,
      version: null,
      features: [],
    };

    if (global.HermesInternal) {
      try {
        const runtimeProps = global.HermesInternal.getRuntimeProperties?.();
        status.version = runtimeProps?.["OSS Release Version"];
        status.features = Object.keys(global.HermesInternal);
      } catch (error) {
        console.warn("Could not get Hermes runtime properties:", error);
      }
    }

    console.log("Hermes Engine Status:", status);
    return status;
  }
}

// シングルトンインスタンス
const nativeModuleManager = new NativeModuleManager();

export default nativeModuleManager;

// 便利な関数をエクスポート
export const waitForJSBridge = () => nativeModuleManager.waitForJSBridge();
export const safeNativeModuleInit = (name, initFn) =>
  nativeModuleManager.safeNativeModuleInit(name, initFn);
export const checkNativeModule = (name) =>
  nativeModuleManager.checkNativeModule(name);
export const checkHermesStatus = () => nativeModuleManager.checkHermesStatus();
