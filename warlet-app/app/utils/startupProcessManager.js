/**
 * 起動時処理の段階的実行・デバッグ用マネージャー
 * TestFlight クラッシュ原因特定のためのテンプレート
 *
 * 使い方：
 * 1. 全処理を無効化 → クラッシュしないか確認
 * 2. 一つずつ有効化 → どの処理でクラッシュするか特定
 */

class StartupProcessManager {
  constructor() {
    this.processes = new Map();
    this.executionOrder = [];
    this.enabledProcesses = new Set();
    this.results = {};
    this.isTestFlightBuild = __DEV__ === false && !global.__EXPO_DEV__;

    console.log(
      `🚀 StartupProcessManager initialized (TestFlight: ${this.isTestFlightBuild})`
    );
  }

  /**
   * 起動時処理を登録
   * @param {string} id - プロセスID
   * @param {Function} processFunction - 実行する関数
   * @param {object} options - オプション
   */
  registerProcess(id, processFunction, options = {}) {
    const {
      priority = 100,
      enabled = true,
      description = "",
      timeout = 10000,
      retries = 0,
      skipInTestFlight = false,
      category = "general",
    } = options;

    // TestFlightでスキップする処理
    if (this.isTestFlightBuild && skipInTestFlight) {
      console.log(`⏭️ Skipping ${id} in TestFlight build`);
      return;
    }

    this.processes.set(id, {
      id,
      processFunction,
      priority,
      enabled,
      description,
      timeout,
      retries,
      category,
      status: "pending",
    });

    // 優先度順でソート
    this.executionOrder = Array.from(this.processes.keys()).sort(
      (a, b) => this.processes.get(a).priority - this.processes.get(b).priority
    );

    if (enabled) {
      this.enabledProcesses.add(id);
    }

    console.log(`📝 Registered process: ${id} (${description})`);
  }

  /**
   * プロセスの有効/無効を切り替え
   */
  toggleProcess(id, enabled) {
    if (this.processes.has(id)) {
      this.processes.get(id).enabled = enabled;
      if (enabled) {
        this.enabledProcesses.add(id);
      } else {
        this.enabledProcesses.delete(id);
      }
      console.log(`🔄 Process ${id}: ${enabled ? "enabled" : "disabled"}`);
    }
  }

  /**
   * カテゴリ単位での有効/無効切り替え
   */
  toggleCategory(category, enabled) {
    for (const [id, process] of this.processes) {
      if (process.category === category) {
        this.toggleProcess(id, enabled);
      }
    }
  }

  /**
   * すべてのプロセスを無効化（デバッグ用）
   */
  disableAll() {
    for (const id of this.processes.keys()) {
      this.toggleProcess(id, false);
    }
    console.log("🚫 All processes disabled");
  }

  /**
   * 単一プロセスの実行
   */
  async executeProcess(id) {
    const process = this.processes.get(id);
    if (!process) {
      throw new Error(`Process ${id} not found`);
    }

    const startTime = Date.now();
    console.log(`▶️ Executing ${id}: ${process.description}`);

    try {
      process.status = "running";

      // タイムアウト付きで実行
      const result = await Promise.race([
        process.processFunction(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), process.timeout)
        ),
      ]);

      const duration = Date.now() - startTime;
      process.status = "completed";
      this.results[id] = { success: true, result, duration };

      console.log(`✅ Completed ${id} in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      process.status = "failed";
      this.results[id] = { success: false, error: error.message, duration };

      console.error(`❌ Failed ${id} after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * 有効なプロセスを順次実行
   */
  async executeAll() {
    console.log(
      `🏃 Starting execution of ${this.enabledProcesses.size} enabled processes`
    );

    const results = {};
    let totalDuration = 0;

    for (const id of this.executionOrder) {
      if (!this.enabledProcesses.has(id)) {
        console.log(`⏭️ Skipping disabled process: ${id}`);
        continue;
      }

      try {
        const startTime = Date.now();
        results[id] = await this.executeProcess(id);
        totalDuration += Date.now() - startTime;

        // プロセス間に少し間隔を空ける（安全のため）
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`💥 Process ${id} failed, stopping execution:`, error);
        results[id] = { error: error.message };
        break; // 失敗したら停止
      }
    }

    console.log(`🏁 Execution completed in ${totalDuration}ms`);
    console.log("📊 Results:", this.results);

    return results;
  }

  /**
   * 段階的デバッグ用：一つずつ有効化して実行
   */
  async debugStepByStep() {
    console.log("🔍 Starting step-by-step debugging...");

    // 全て無効化
    this.disableAll();

    const debugResults = {};

    for (const id of this.executionOrder) {
      console.log(`\n🧪 Testing process: ${id}`);

      // 当該プロセスのみ有効化
      this.toggleProcess(id, true);

      try {
        // 個別実行
        await this.executeProcess(id);
        debugResults[id] = "PASS";
        console.log(`✅ ${id}: PASSED`);
      } catch (error) {
        debugResults[id] = `FAIL: ${error.message}`;
        console.error(`❌ ${id}: FAILED -`, error.message);

        // 失敗したプロセスを無効化
        this.toggleProcess(id, false);
      }

      // 次のテストのために少し待機
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log("\n📊 Step-by-step debug results:", debugResults);
    return debugResults;
  }

  /**
   * 現在の状態を表示
   */
  getStatus() {
    const status = {
      totalProcesses: this.processes.size,
      enabledProcesses: this.enabledProcesses.size,
      isTestFlightBuild: this.isTestFlightBuild,
      processes: {},
    };

    for (const [id, process] of this.processes) {
      status.processes[id] = {
        enabled: this.enabledProcesses.has(id),
        status: process.status,
        category: process.category,
        description: process.description,
      };
    }

    return status;
  }
}

// シングルトンインスタンス
const startupManager = new StartupProcessManager();

export default startupManager;

// 便利な関数をエクスポート
export const registerStartupProcess = (id, fn, options) =>
  startupManager.registerProcess(id, fn, options);
export const executeStartupProcesses = () => startupManager.executeAll();
export const debugStartupProcesses = () => startupManager.debugStepByStep();
export const disableAllStartupProcesses = () => startupManager.disableAll();
