import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  Icon,
  UserIcon,
  EmailIcon,
  LockIcon,
  AppleIcon,
} from "../../lib/icons";

// 重複しているAppleIconの定義を削除

const RegisterScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");

  const DEFAULT_AVATAR =
    "https://gtblczddbnbxzmeppina.supabase.co/storage/v1/object/public/avatars//icon_default.jpeg";

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      Alert.alert("エラー", "パスワードが一致しません");
      return;
    }
    try {
      setLoading(true);
      const {
        data: { user },
        error,
      } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        throw error;
      }

      const accountId = `user_${user.id.slice(0, 8)}`;

      const { error: insertError } = await supabase.from("users_info").insert([
        {
          auth_id: user.id,
          email: email || "",
          name: "ユーザー",
          account_id: accountId || "",
          account_name: "",
          avatar_url: DEFAULT_AVATAR,
        },
      ]);

      if (insertError) {
        throw insertError;
      }

      Alert.alert("登録完了", "登録が完了しました。");
      router.replace("/(tabs)/home/home");
    } catch (error) {
      console.error("Registration error:", error);
      Alert.alert(
        "登録エラー",
        "登録できませんでした。しばらくしてからお試しください。"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignup = async () => {
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!cred.identityToken) {
        throw new Error("identityTokenがありません");
      }

      const {
        data: { user },
        error,
      } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: cred.identityToken,
      });

      if (error) {
        throw error;
      }

      const name =
        (cred.fullName?.familyName || "") +
        " " +
        (cred.fullName?.givenName || "");
      const email = cred.email || user.email || "";
      const accountId = `apple_${user.id.slice(0, 8)}`;
      const rawName =
        (cred.fullName?.familyName || "") + (cred.fullName?.givenName || "");

      const accountName = rawName
        ? `${rawName}`
        : `apple_user_${Math.floor(Math.random() * 10000)}`;

      const { error: insertError } = await supabase.from("users_info").insert([
        {
          auth_id: user.id,
          email: email || "",
          name: rawName || "ユーザー",
          account_id: accountId || "",
          account_name: accountName,
          avatar_url: DEFAULT_AVATAR,
        },
      ]);

      if (insertError) {
        throw insertError;
      }

      Alert.alert("登録完了", "Appleアカウントで登録が完了しました");
      router.replace("/(tabs)/home/home");
    } catch (e) {
      if (e.code === "ERR_REQUEST_CANCELED") {
        // キャンセルされた場合は何もしない
      } else {
        console.error("Apple認証エラー:", e);
        Alert.alert(
          "登録エラー",
          "登録できませんでした。しばらくしてからお試しください。"
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* タイトルセクション */}
        <View style={styles.titleSection}>
          <Icon bgColor="#E5F3FF">
            <UserIcon />
          </Icon>
          <Text style={styles.title}>アカウント登録</Text>
          <Text style={styles.description}>
            機種変更や紛失をしても全ての情報が維持されます。
          </Text>
          <Text style={styles.description}>
            また、セキュリティも強化されます。
          </Text>
        </View>

        {/* メール登録セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>メールアドレスで登録</Text>

          <View style={styles.inputCard}>
            <Icon bgColor="#E5F3FF">
              <EmailIcon />
            </Icon>
            <View style={styles.inputContent}>
              <Text style={styles.inputLabel}>メールアドレス</Text>
              <TextInput
                placeholder="メール"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.inputCard}>
            <Icon bgColor="#FFE5E5">
              <LockIcon />
            </Icon>
            <View style={styles.inputContent}>
              <Text style={styles.inputLabel}>パスワード</Text>
              <TextInput
                placeholder="英数字6文字以上"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.inputCard}>
            <Icon bgColor="#FFE5E5">
              <LockIcon />
            </Icon>
            <View style={styles.inputContent}>
              <Text style={styles.inputLabel}>パスワード（確認）</Text>
              <TextInput
                placeholder="再入力"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                style={styles.input}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.registerButtonText}>アカウントを登録</Text>
          </TouchableOpacity>
        </View>

        {/* Apple登録セクション */}
        {Platform.OS === "ios" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Apple IDで登録</Text>
            <View style={styles.appleCard}>
              <Icon bgColor="#000">
                <AppleIcon />
              </Icon>
              <View style={styles.appleContent}>
                <Text style={styles.appleText}>Apple IDで簡単登録</Text>
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={
                    AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                  }
                  buttonStyle={
                    AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                  }
                  cornerRadius={8}
                  style={styles.appleButton}
                  onPress={handleAppleSignup}
                />
              </View>
            </View>
          </View>
        )}

        {/* ログインリンク */}
        <View style={styles.loginSection}>
          <Text style={styles.loginText}>アカウントをお持ちの方</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.loginButtonText}>ログイン</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 40,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 12,
    color: "#3d547f",
  },
  description: {
    fontSize: 14,
    color: "#6a7581",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#3d547f",
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
  registerButton: {
    backgroundColor: "#3d547f",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#3d547f",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  appleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#f1f2f4",
  },
  appleContent: {
    flex: 1,
  },
  appleText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#121416",
    marginBottom: 12,
  },
  appleButton: {
    height: 40,
    width: "100%",
  },
  loginSection: {
    alignItems: "center",
    marginTop: 16,
  },
  loginText: {
    fontSize: 14,
    color: "#6a7581",
    marginBottom: 12,
  },
  loginButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#3d547f",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  loginButtonText: {
    color: "#3d547f",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default RegisterScreen;
