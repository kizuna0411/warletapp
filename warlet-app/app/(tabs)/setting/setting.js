import React, { useLayoutEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Linking,
  Share,
} from "react-native";
import { useNavigation } from "expo-router";
import { supabase } from "../../../lib/supabase";
import {
  Icon,
  ProfileIcon,
  PaymentIcon,
  SettingsIcon,
  LogoutIcon,
  InviteIcon,
  DeleteAccountIcon,
  CashlessIcon,
  QuestionIcon,
} from "../../../lib/icons";

const settingsOptions = [
  {
    id: "1",
    name: "プロフィール編集",
    screen: "profile",
    disabled: false,
    icon: <ProfileIcon />,
    bgColor: "#E5F3FF",
  },
  {
    id: "2",
    name: "支払い設定",
    screen: "payment",
    disabled: false,
    icon: <PaymentIcon />,
    bgColor: "#E5FFE5",
  },
  {
    id: "3",
    name: "通知設定",
    screen: "NotificationSettings",
    disabled: true,
    icon: <SettingsIcon />,
    bgColor: "#FFF5E5",
  },
  {
    id: "4",
    name: "アカウント設定",
    screen: "AccountSettings",
    disabled: true,
    icon: <SettingsIcon />,
    bgColor: "#F0E5FF",
  },
  {
    id: "5",
    name: "ヘルプ",
    screen: "Help",
    disabled: true,
    icon: <SettingsIcon />,
    bgColor: "#FFE5F5",
  },
  {
    id: "6",
    name: "お問い合わせ(外部リンク)",
    url: "https://tally.so/r/wQExJ7",
    disabled: false,
    icon: <QuestionIcon />,
    bgColor: "#E5F3FF",
  },
  {
    id: "7",
    name: "友達に共有する",
    icon: <InviteIcon />,
    bgColor: "#E5FFE5",
  },
  {
    id: "8",
    name: "アカウント削除",
    screen: "delete-account",
    disabled: false,
    icon: <DeleteAccountIcon />,
    bgColor: "#FFE5E5",
  },
];

const SettingsScreen = () => {
  const navigation = useNavigation();

  const handleLogout = async () => {
    Alert.alert("ログアウト", "本当にログアウトしますか？", [
      {
        text: "キャンセル",
        style: "cancel",
      },
      {
        text: "ログアウト",
        onPress: async () => {
          try {
            const { error } = await supabase.auth.signOut();
            if (error) {
              throw error;
            }
            Alert.alert("ログアウト完了", "ログアウトしました。");
          } catch (error) {
            console.error("ログアウトエラー: ", error);
            Alert.alert("エラー", "ログアウトに失敗しました。");
          }
        },
      },
    ]);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message:
          "ワリカンをカンタンに。われっと使ってみませんか？ https://warlet-app.com",
      });
    } catch (error) {
      console.error("共有エラー:", error);
    }
  };

  const renderSettingItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.settingItem, item.disabled && styles.disabledItem]}
      onPress={() => {
        if (item.disabled) {
          return;
        }
        if (item.screen) {
          navigation.navigate(item.screen);
        } else if (item.url) {
          Linking.openURL(item.url);
        } else if (item.name === "友達に共有する") {
          handleShare();
        }
      }}
      disabled={item.disabled}
      activeOpacity={0.7}
    >
      <Icon bgColor={item.disabled ? "#f5f5f5" : item.bgColor}>
        {item.icon}
      </Icon>
      <View style={styles.settingContent}>
        <Text
          style={[styles.settingName, item.disabled && styles.disabledText]}
        >
          {item.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <FlatList
          data={settingsOptions}
          keyExtractor={(item) => item.id}
          renderItem={renderSettingItem}
          contentContainerStyle={styles.settingsList}
        />
      </View>

      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>ログアウト</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  section: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  settingsList: {
    paddingBottom: 100,
  },
  settingItem: {
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
  disabledItem: {
    backgroundColor: "#f8f9fa",
    opacity: 0.6,
  },
  settingContent: {
    flex: 1,
  },
  settingName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#121416",
  },
  disabledText: {
    color: "#8B9DC3",
  },
  fixedButtonContainer: {
    position: "absolute",
    bottom: 34,
    left: 16,
    right: 16,
  },
  logoutButton: {
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
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default SettingsScreen;
