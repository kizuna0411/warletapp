import React, { useState, useLayoutEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { getUserIdFromAuthId } from "../../utils/utils";
import { useNavigation } from "@react-navigation/native";
import { Icon, InviteIcon, JoinIcon } from "../../../lib/icons";

export default function JoinGroupByCodeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoinGroup = async () => {
    if (inviteCode.trim() === "") {
      Alert.alert("エラー", "招待コードを入力してください");
      return;
    }

    setLoading(true);
    try {
      const { data: groupData, error: groupError } = await supabase
        .from("group_info")
        .select("id")
        .eq("invite_code", inviteCode)
        .single();

      if (groupError || !groupData) {
        Alert.alert("エラー", "有効な招待コードが見つかりませんでした");
        setLoading(false);
        return;
      }

      const userId = await getUserIdFromAuthId();
      if (!userId) {
        Alert.alert("エラー", "ユーザーIDの取得に失敗しました");
        setLoading(false);
        return;
      }

      const { error: joinError } = await supabase
        .from("group_member")
        .insert([{ group_id: groupData.id, user_id: userId }]);

      if (joinError) {
        Alert.alert(
          "エラー",
          "グループ参加に失敗しました: " + joinError.message
        );
        setLoading(false);
        return;
      }

      Alert.alert("成功", "グループに参加しました！");
      router.replace("/");
    } catch (error) {
      console.error("グループ参加エラー:", error);
      Alert.alert("エラー", "グループ参加中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>招待コードで参加</Text>
          <View style={styles.inputCard}>
            <Icon bgColor="#E5F3FF">
              <InviteIcon />
            </Icon>
            <View style={styles.inputContent}>
              <Text style={styles.inputLabel}>招待コード</Text>
              <TextInput
                style={styles.input}
                placeholder="コードを入力してください"
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
              />
            </View>
          </View>
          <Text style={styles.helperText}>
            グループの作成者から共有された6文字のコードを入力してください
          </Text>
        </View>
      </View>

      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={handleJoinGroup}
          disabled={loading}
        >
          <JoinIcon />
          <Text style={styles.buttonText}>
            {loading ? "参加中..." : "グループに参加"}
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
    flex: 1,
    paddingTop: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#3d547f",
    marginBottom: 12,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    width: 40,
    height: 40,
    flexShrink: 0,
  },
  inputCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#f1f2f4",
    marginBottom: 12,
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6a7581",
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    color: "#121416",
    padding: 0,
  },
  helperText: {
    fontSize: 14,
    color: "#8B9DC3",
    lineHeight: 20,
  },
  fixedButtonContainer: {
    position: "absolute",
    bottom: 34,
    left: 16,
    right: 16,
  },
  buttonPrimary: {
    width: "100%",
    paddingVertical: 16,
    backgroundColor: "#3d547f",
    borderRadius: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#3d547f",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
});
