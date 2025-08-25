import React, { useState, useLayoutEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { supabase } from "../../../lib/supabase";
import { getUserIdFromAuthId } from "../../utils/utils";
import { useNavigation } from "@react-navigation/native";
import {
  Icon,
  GroupIcon,
  InviteIcon,
  CopyIcon,
  ShareIcon,
} from "../../../lib/icons";

const generateInviteCode = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function CreateGroupScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [groupId, setGroupId] = useState(null);

  const handleCreateGroup = async () => {
    if (groupName.trim() === "") {
      Alert.alert("エラー", "グループ名を入力してください");
      return;
    }

    const ownerId = await getUserIdFromAuthId();
    if (!ownerId) {
      console.error("ユーザーIDの取得に失敗しました。");
      return;
    }

    try {
      console.log("グループ作成開始");

      const code = generateInviteCode();
      console.log("生成された招待コード:", code);

      const { data: groupData, error: error2 } = await supabase
        .from("group_info")
        .insert([{ name: groupName, owner_id: ownerId, invite_code: code }])
        .select("id, invite_code")
        .single();

      if (error2) {
        console.error("DB登録エラー:", error2);
        Alert.alert("エラー", "グループ作成に失敗しました: " + error2.message);
        return;
      }

      const { data: groupMember, error: error3 } = await supabase
        .from("group_member")
        .insert([{ group_id: groupData.id, user_id: ownerId }])
        .single();

      if (error3) {
        console.error("DB登録エラー@group_member:", error3);
        Alert.alert("エラー", "メンバー登録に失敗しました: " + error3.message);
        return;
      }

      if (!groupData?.id) {
        console.error("グループ作成に失敗: ID が取得できませんでした");
        Alert.alert("エラー", "グループ作成に失敗しました。");
        return;
      }

      console.log("作成されたグループ ID:", groupData.id);

      setInviteCode(groupData.invite_code);
      console.log("保存された招待コード:", groupData.invite_code);

      Alert.alert("成功", "グループが作成されました");
    } catch (error) {
      console.error("招待コード作成エラー:", error);
      Alert.alert("エラー", "招待コード作成に失敗しました。");
    }
  };

  const handleShare = async () => {
    if (inviteCode) {
      const groupUrl = `https://your-app-link.com/group/${inviteCode}`;
      const appUrl = "https://your-app-link.com";
      const message = `${groupName}に参加しませんか？招待コード: ${inviteCode} で参加できます！\nグループ参加はこちらのURLから: ${appUrl}`;

      try {
        await Share.share({
          message,
        });
      } catch (error) {
        console.error("シェアエラー:", error);
        Alert.alert("エラー", "シェアに失敗しました。");
      }
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>新しいグループ</Text>
          <View style={styles.inputCard}>
            <Icon bgColor="#E5F3FF">
              <GroupIcon />
            </Icon>
            <View style={styles.inputContent}>
              <Text style={styles.inputLabel}>グループ名</Text>
              <TextInput
                style={styles.input}
                placeholder="例: 飲み会メンバー、旅行計画"
                value={groupName}
                onChangeText={setGroupName}
              />
            </View>
          </View>
        </View>

        {inviteCode !== "" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>招待コード</Text>
            <View style={styles.inviteCard}>
              <Icon bgColor="#E5FFE5">
                <InviteIcon />
              </Icon>
              <View style={styles.inviteContent}>
                <Text style={styles.inviteCodeText}>{inviteCode}</Text>
                <Text style={styles.inviteSubText}>
                  このコードを友達に教えてグループに招待しましょう
                </Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={async () => {
                  await Clipboard.setStringAsync(inviteCode);
                  Alert.alert("コピー", "招待コードをコピーしました！");
                }}
              >
                <CopyIcon />
                <Text style={styles.actionButtonText}>コピー</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleShare}
              >
                <ShareIcon />
                <Text style={styles.actionButtonText}>共有</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={handleCreateGroup}
        >
          <Text style={styles.buttonText}>グループを作成</Text>
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#3d547f",
    marginBottom: 12,
    marginTop: 20,
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
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#f1f2f4",
    marginBottom: 16,
  },
  inviteContent: {
    flex: 1,
  },
  inviteCodeText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#121416",
    marginBottom: 4,
  },
  inviteSubText: {
    fontSize: 14,
    color: "#6a7581",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3d547f",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
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
  },
});
