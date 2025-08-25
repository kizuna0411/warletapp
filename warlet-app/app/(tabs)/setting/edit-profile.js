import React, {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useFocusEffect } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { getUserIdFromAuthId } from "@/app/utils/utils";
import { Icon, ProfileIcon, LockIcon } from "../../../lib/icons";

const DEFAULT_AVATAR_URL =
  "https://gtblczddbnbxzmeppina.supabase.co/storage/v1/object/public/avatars//icon_default.jpeg";

const ICON_CANDIDATES = [
  "https://gtblczddbnbxzmeppina.supabase.co/storage/v1/object/public/avatars//icon_default.jpeg",
  "https://gtblczddbnbxzmeppina.supabase.co/storage/v1/object/public/avatars//icon-1.png",
  "https://gtblczddbnbxzmeppina.supabase.co/storage/v1/object/public/avatars//icon-2.png",
  "https://gtblczddbnbxzmeppina.supabase.co/storage/v1/object/public/avatars//icon-3.png",
  "https://gtblczddbnbxzmeppina.supabase.co/storage/v1/object/public/avatars//icon-4.png",
  "https://gtblczddbnbxzmeppina.supabase.co/storage/v1/object/public/avatars//icon-5.png",
];

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState({
    name: "",
    account_id: "",
    email: "",
    account_name: "",
    avatar_url: DEFAULT_AVATAR_URL,
  });
  const [loading, setLoading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(DEFAULT_AVATAR_URL);

  const fetchProfile = async () => {
    try {
      const userId = await getUserIdFromAuthId();
      if (!userId) {
        console.error("ユーザーIDの取得に失敗しました");
        return;
      }

      const { data, error } = await supabase
        .from("users_info")
        .select("name, account_id, email, account_name, avatar_url")
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
        setSelectedIcon(data.avatar_url || DEFAULT_AVATAR_URL);
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

  const updateProfile = async () => {
    setLoading(true);

    if (!profile.account_name || !profile.account_id || !profile.email) {
      Alert.alert(
        "入力エラー",
        "ユーザーネーム、アカウントID、メールアドレスは必須です"
      );
      setLoading(false);
      return;
    }

    if (newPassword || confirmNewPassword) {
      if (newPassword !== confirmNewPassword) {
        setPasswordError("新しいパスワードが一致しません");
        setLoading(false);
        return;
      }
      if (newPassword.length < 8) {
        setPasswordError("パスワードは8文字以上にしてください");
        setLoading(false);
        return;
      }
    }
    setPasswordError("");

    try {
      const userId = await getUserIdFromAuthId();
      console.log("更新対象のユーザーID:", userId);

      const { error } = await supabase
        .from("users_info")
        .update({
          name: profile.name,
          account_id: profile.account_id,
          account_name: profile.account_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
        })
        .eq("id", userId);

      if (error) {
        throw error;
      }

      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (passwordError) {
          throw passwordError;
        }
      }

      Alert.alert("更新成功", "プロフィールが更新されました！");
      navigation.goBack();
    } catch (error) {
      console.error("プロフィール更新エラー: ", error);
      Alert.alert("エラー", "プロフィールの更新に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleIconSelect = (iconUrl) => {
    setSelectedIcon(iconUrl);
    setProfile({ ...profile, avatar_url: iconUrl });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={100}
    >
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>アバター選択</Text>
            <View style={styles.avatarCard}>
              <View style={styles.avatarContainer}>
                <Image source={{ uri: selectedIcon }} style={styles.avatar} />
                <Text style={styles.avatarLabel}>タップして変更</Text>
              </View>
            </View>
            <View style={styles.iconCandidatesContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.iconCandidatesList}
              >
                {ICON_CANDIDATES.map((iconUrl, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleIconSelect(iconUrl)}
                    style={[
                      styles.iconWrapper,
                      selectedIcon === iconUrl && styles.selectedIconWrapper,
                    ]}
                  >
                    <Image source={{ uri: iconUrl }} style={styles.iconImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>基本情報</Text>

            <View style={styles.inputCard}>
              <Icon bgColor="#E5F3FF">
                <ProfileIcon />
              </Icon>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>名前</Text>
                <TextInput
                  style={styles.input}
                  value={profile.name}
                  onChangeText={(text) =>
                    setProfile({ ...profile, name: text })
                  }
                  placeholder="名前を入力"
                />
              </View>
            </View>

            <View style={styles.inputCard}>
              <Icon bgColor="#E5FFE5">
                <ProfileIcon />
              </Icon>
              <View style={styles.inputContent}>
                <Text style={[styles.inputLabel, styles.requiredLabel]}>
                  ユーザーネーム <Text style={styles.required}>*必須</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={profile.account_name}
                  onChangeText={(text) =>
                    setProfile({ ...profile, account_name: text })
                  }
                  placeholder="ユーザーネームを入力"
                />
              </View>
            </View>

            <View style={styles.inputCard}>
              <Icon bgColor="#FFF5E5">
                <ProfileIcon />
              </Icon>
              <View style={styles.inputContent}>
                <Text style={[styles.inputLabel, styles.requiredLabel]}>
                  アカウントID <Text style={styles.required}>*必須</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={profile.account_id}
                  onChangeText={(text) =>
                    setProfile({ ...profile, account_id: text })
                  }
                  placeholder="IDを入力"
                />
              </View>
            </View>

            <View style={styles.inputCard}>
              <Icon bgColor="#F0E5FF">
                <ProfileIcon />
              </Icon>
              <View style={styles.inputContent}>
                <Text style={[styles.inputLabel, styles.requiredLabel]}>
                  メールアドレス <Text style={styles.required}>*必須</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={profile.email}
                  onChangeText={(text) =>
                    setProfile({ ...profile, email: text })
                  }
                  placeholder="メールアドレスを入力"
                  keyboardType="email-address"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>パスワード変更</Text>

            <View style={styles.inputCard}>
              <Icon bgColor="#FFE5E5">
                <LockIcon />
              </Icon>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>
                  新しいパスワード（変更する場合のみ）
                </Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="新しいパスワードを入力"
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.inputCard}>
              <Icon bgColor="#FFE5F5">
                <LockIcon />
              </Icon>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>新しいパスワード（確認）</Text>
                <TextInput
                  style={styles.input}
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  placeholder="再入力"
                  secureTextEntry
                />
              </View>
            </View>

            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.fixedButtonContainer}>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={updateProfile}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "更新中..." : "プロフィールを更新"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    marginTop: 16,
  },
  avatarCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f2f4",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  avatarLabel: {
    fontSize: 14,
    color: "#6a7581",
  },
  iconCandidatesContainer: {
    marginBottom: 8,
  },
  iconCandidatesList: {
    paddingHorizontal: 4,
  },
  iconWrapper: {
    marginRight: 12,
    borderRadius: 8,
    padding: 2,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedIconWrapper: {
    borderColor: "#3d547f",
    backgroundColor: "#E5F3FF",
  },
  iconImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
  requiredLabel: {
    color: "#3d547f",
  },
  required: {
    color: "#dc3545",
    fontSize: 12,
  },
  input: {
    fontSize: 16,
    color: "#121416",
    padding: 0,
  },
  errorText: {
    color: "#dc3545",
    fontSize: 14,
    marginTop: 8,
    paddingHorizontal: 16,
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
