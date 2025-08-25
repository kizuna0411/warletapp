import React, { useState, useEffect, useLayoutEffect } from "react";
import {
  Alert,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  AppState,
  ScrollView,
} from "react-native";
import { supabase } from "../../../lib/supabase";
import { useNavigation } from "@react-navigation/native";
import { Icon, WarningIcon, CheckIcon } from "../../../lib/icons";

AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export default function DeleteAccountScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [confirmations, setConfirmations] = useState({
    dataLoss: false,
    noRecovery: false,
    logout: false,
  });

  const allConfirmed = Object.values(confirmations).every(Boolean);

  async function deleteAccount() {
    if (!allConfirmed) {
      Alert.alert("すべての確認事項にチェックを入れてください。");
      console.log("確認事項が未完了");
      return;
    }

    Alert.alert(
      "アカウント削除",
      "本当にアカウントを削除しますか？この操作は取り消せません。",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除する",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            console.log("アカウント削除開始");

            const {
              data: { session },
              error: sessionError,
            } = await supabase.auth.getSession();
            if (sessionError || !session) {
              Alert.alert("認証情報を取得できません");
              console.log("認証情報の取得に失敗");
              setLoading(false);
              return;
            }

            console.log("Supabase関数でユーザー情報削除処理開始");
            const response = await fetch(
              "https://gtblczddbnbxzmeppina.supabase.co/functions/v1/delete-supabase-auth-user",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                },
              }
            );

            const result = await response.json();
            console.log("Supabase関数からのレスポンス:", result);

            if (!response.ok) {
              Alert.alert("削除に失敗しました", result.error || "不明なエラー");
              console.log("削除に失敗0:", result.error);
            } else {
              console.log("関連データ削除開始");

              const { error: deleteError } = await supabase.rpc(
                "delete_user_and_data",
                {
                  auth_user_id: session.user.id,
                }
              );

              if (deleteError) {
                Alert.alert(
                  "関連データの削除に失敗しました",
                  deleteError.message || "不明なエラー"
                );
                console.log("関連データの削除に失敗1:", deleteError.message);
              } else {
                Alert.alert("アカウントを削除しました");
                console.log("アカウント削除成功");
                await supabase.auth.signOut();
              }
            }

            setLoading(false);
          },
        },
      ],
      { cancelable: true }
    );
  }

  const toggleConfirmation = (key) => {
    setConfirmations((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const confirmationItems = [
    {
      key: "dataLoss",
      text: "全てのデータが完全に削除されることを理解しました。",
    },
    {
      key: "noRecovery",
      text: "この操作が取り消せないことを理解しました。",
    },
    {
      key: "logout",
      text: "削除後にログアウトされることを理解しました。",
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <View style={styles.warningCard}>
            <Icon bgColor="#FFE5E5">
              <WarningIcon />
            </Icon>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>重要な警告</Text>
              <Text style={styles.warningText}>
                アカウントを削除すると、すべてのデータが完全に削除され、復元することはできません。
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>削除前の確認事項</Text>
          <Text style={styles.sectionSubText}>
            以下の内容をご確認の上、すべてにチェックを入れてください
          </Text>

          {confirmationItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.checkboxItem}
              onPress={() => toggleConfirmation(item.key)}
              activeOpacity={0.7}
            >
              <View style={styles.checkboxContainer}>
                {confirmations[item.key] ? (
                  <View style={styles.checkedBox}>
                    <CheckIcon />
                  </View>
                ) : (
                  <View style={styles.uncheckedBox} />
                )}
              </View>
              <Text style={styles.checkboxText}>{item.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity
          style={[
            styles.buttonDanger,
            (!allConfirmed || loading) && styles.buttonDisabled,
          ]}
          onPress={deleteAccount}
          disabled={!allConfirmed || loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "削除中..." : "アカウントを削除する"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#3d547f",
    marginBottom: 4,
  },
  sectionSubText: {
    fontSize: 14,
    color: "#6a7581",
    marginBottom: 16,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    width: 40,
    height: 40,
    flexShrink: 0,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#f1f2f4",
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#dc3545",
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: "#6a7581",
    lineHeight: 20,
  },
  checkboxItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#f1f2f4",
  },
  checkboxContainer: {
    marginTop: 2,
  },
  checkedBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: "#28a745",
    alignItems: "center",
    justifyContent: "center",
  },
  uncheckedBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
  },
  checkboxText: {
    fontSize: 16,
    color: "#121416",
    lineHeight: 24,
    flex: 1,
  },
  fixedButtonContainer: {
    position: "absolute",
    bottom: 34,
    left: 16,
    right: 16,
  },
  buttonDanger: {
    width: "100%",
    paddingVertical: 16,
    backgroundColor: "#dc3545",
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#dc3545",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: "#ddd",
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
