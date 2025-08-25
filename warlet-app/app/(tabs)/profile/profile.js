import React, { useState, useCallback, useLayoutEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { supabase } from "../../../lib/supabase";
import { getUserIdFromAuthId } from "../../utils/utils";
import { Icon, SettingsIcon, LogoutIcon } from "../../../lib/icons";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState({
    name: "",
    email: "",
    avatar_url: "",
  });
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async () => {
    setLoading(true);
    try {
      const userId = await getUserIdFromAuthId();
      if (!userId) {
        console.error("ユーザーIDの取得に失敗しました。");
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users_info")
        .select("account_name, email, avatar_url")
        .eq("id", userId)
        .single();

      if (userError) {
        console.error("ユーザー情報取得エラー:", userError);
        setLoading(false);
        return;
      }

      setUser({
        name: userData.account_name || "名前未設定",
        email: userData.email || "メール未設定",
        avatar_url: userData.avatar_url || "https://via.placeholder.com/150",
      });
    } catch (error) {
      console.error("プロフィール取得エラー:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, [fetchUserProfile])
  );

  const handleLogout = async () => {
    Alert.alert("ログアウト", "ログアウトしますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "ログアウト",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase.auth.signOut();
            if (error) {
              console.error("ログアウトエラー:", error);
              Alert.alert("エラー", "ログアウトに失敗しました。");
            }
          } catch (error) {
            console.error("ログアウト処理エラー:", error);
            Alert.alert("エラー", "ログアウト中にエラーが発生しました。");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3d547f" />
        <Text style={styles.loadingText}>プロフィールを読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ユーザー情報</Text>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          </View>
          <View style={styles.profileContent}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>設定</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("profile-settings")}
          activeOpacity={0.7}
        >
          <Icon bgColor="#E5F3FF">
            <SettingsIcon />
          </Icon>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>プロフィール設定</Text>
            <Text style={styles.menuSubTitle}>名前やアイコンを変更</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Icon bgColor="#FFE5E5">
            <LogoutIcon />
          </Icon>
          <View style={styles.menuContent}>
            <Text style={[styles.menuTitle, styles.logoutText]}>
              ログアウト
            </Text>
            <Text style={styles.menuSubTitle}>アプリからログアウト</Text>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6a7581",
    fontWeight: "500",
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
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    gap: 16,
    borderWidth: 1,
    borderColor: "#f1f2f4",
  },
  avatarContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f1f2f4",
  },
  profileContent: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#121416",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#6a7581",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    gap: 16,
    borderWidth: 1,
    borderColor: "#f1f2f4",
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#121416",
    marginBottom: 4,
  },
  menuSubTitle: {
    fontSize: 14,
    color: "#6a7581",
  },
  logoutText: {
    color: "#dc3545",
  },
});
