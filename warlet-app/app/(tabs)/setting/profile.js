import React, { useState, useCallback, useLayoutEffect } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation, useFocusEffect } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { getUserIdFromAuthId } from "@/app/utils/utils";
import { Icon } from "../../../lib/icons";

const DEFAULT_AVATAR_URL =
  "https://gtblczddbnbxzmeppina.supabase.co/storage/v1/object/public/avatars//icon_default.jpeg";

export default function ProfileSettingScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    account_name: "",
    account_id: "",
    avatar_url: DEFAULT_AVATAR_URL,
  });

  const fetchProfile = async () => {
    try {
      const userId = await getUserIdFromAuthId();
      if (!userId) {
        console.error("ユーザーIDの取得に失敗しました");
        return;
      }

      const { data, error } = await supabase
        .from("users_info")
        .select("name, email, account_name, account_id, avatar_url")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("プロフィール取得エラー: ", error);
      } else if (data) {
        setProfile({
          name: data.name || "",
          account_name: data.account_name || "",
          account_id: data.account_id || "",
          email: data.email || "",
          avatar_url: data.avatar_url || DEFAULT_AVATAR_URL,
        });
      }
    } catch (err) {
      console.error("fetchProfile のエラー: ", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>プロフィール情報</Text>

        <View style={styles.infoCard}>
          <View style={styles.profileIconContainer}>
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.profileIcon}
              onError={() =>
                setProfile({ ...profile, avatar_url: DEFAULT_AVATAR_URL })
              }
            />
          </View>
          <View style={styles.infoContent}>
            <View style={styles.infoItem}>
              <Text style={styles.label}>名前</Text>
              <Text style={styles.value}>{profile.name}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>ユーザーネーム</Text>
              <Text style={styles.value}>{profile.account_name}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>アカウントID</Text>
              <Text style={styles.value}>{profile.account_id}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>メールアドレス</Text>
              <Text style={styles.value}>{profile.email}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={() => navigation.navigate("edit-profile")}
        >
          <Text style={styles.buttonText}>プロフィールを編集</Text>
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
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#3d547f",
    marginBottom: 12,
    marginTop: 16,
  },
  avatarCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f2f4",
    marginBottom: 16,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f1f2f4",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#f1f2f4",
  },
  profileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f2f4",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  infoContent: {
    flex: 1,
    gap: 12,
  },
  infoItem: {
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6a7581",
  },
  value: {
    fontSize: 16,
    fontWeight: "500",
    color: "#121416",
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
