/**
 * 統一されたヘッダー設定を提供するユーティリティ
 */

/**
 * 共通のヘッダーオプションを取得
 * @param {string} title 
 * @param {Object} additionalOptions 
 * @returns {Object} 
 */
export const getCommonHeaderOptions = (title, additionalOptions = {}) => {
  return {
    title,
    headerStyle: {
      backgroundColor: "#3d547f",
    },
    headerTintColor: "#fff",
    headerTitleStyle: {
      fontWeight: "bold",
      fontSize: 18,
      color: "#fff",
    },
    ...additionalOptions,
  };
};

/**
 * ヘッダーの共通スタイル定数
 */
export const HEADER_STYLES = {
  backgroundColor: "#3d547f",
  tintColor: "#fff",
  titleStyle: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#fff",
  },
};
