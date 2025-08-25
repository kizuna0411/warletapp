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
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  Icon,
  LoginIcon,
  EmailIcon,
  LockIcon,
  AppleIcon,
} from "../../lib/icons";

const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const DEFAULT_AVATAR =
    "https://gtblczddbnbxzmeppina.supabase.co/storage/v1/object/public/avatars//icon_default.jpeg";

  const handleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw error;
      }
      Alert.alert("ログイン成功", "ログインしました。");
      router.replace("/(tabs)/home/home");
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert(
        "ログインエラー",
        "メールアドレスまたはパスワードが間違っています。"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
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

      const { data: existingUser } = await supabase
        .from("users_info")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (!existingUser) {
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

        const { error: insertError } = await supabase
          .from("users_info")
          .insert([
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
      }

      Alert.alert("ログイン成功", "Appleアカウントでログインしました");
      router.replace("/(tabs)/home/home");
    } catch (e) {
      if (e.code === "ERR_REQUEST_CANCELED") {
      } else {
        console.error("Apple認証エラー:", e);
        Alert.alert(
          "ログインエラー",
          "ログインできませんでした。しばらくしてからお試しください。"
        );
      }
    }
  };

  const handleForgotPassword = async () => {
    try {
      await Linking.openURL("https://tally.so/r/wQExJ7");
    } catch (error) {
      console.error("URLを開けませんでした:", error);
      Alert.alert("エラー", "URLを開けませんでした。");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.titleSection}>
          <Icon bgColor="#E5F3FF">
            <LoginIcon />
          </Icon>
          <Text style={styles.title}>ログイン</Text>
          <Text style={styles.description}>
            アカウントにログインしてご利用ください
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>メールアドレスでログイン</Text>

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
                placeholder="パスワード"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>ログイン</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={handleForgotPassword}
          >
            <Text style={styles.linkText}>お問い合わせ</Text>
          </TouchableOpacity>
        </View>

        {Platform.OS === "ios" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Apple IDでログイン</Text>
            <View style={styles.appleCard}>
              <Icon bgColor="#000">
                <AppleIcon />
              </Icon>
              <View style={styles.appleContent}>
                <Text style={styles.appleText}>Apple IDで簡単ログイン</Text>
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={
                    AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                  }
                  buttonStyle={
                    AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                  }
                  cornerRadius={8}
                  style={styles.appleButton}
                  onPress={handleAppleLogin}
                />
              </View>
            </View>
          </View>
        )}

        <View style={styles.signupSection}>
          <Text style={styles.signupText}>アカウントをお持ちでない方</Text>
          <TouchableOpacity
            style={styles.signupButton}
            onPress={() => router.push("/signup")}
          >
            <Text style={styles.signupButtonText}>新規登録</Text>
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
  loginButton: {
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
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  linkButton: {
    alignItems: "center",
    marginTop: 16,
  },
  linkText: {
    color: "#3d547f",
    fontSize: 14,
    fontWeight: "500",
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
  signupSection: {
    alignItems: "center",
    marginTop: 16,
  },
  signupText: {
    fontSize: 14,
    color: "#6a7581",
    marginBottom: 12,
  },
  signupButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#3d547f",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  signupButtonText: {
    color: "#3d547f",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default LoginScreen;
