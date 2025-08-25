import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../lib/supabase";

export default function JoinGroupScreen() {
  const { groupId } = useLocalSearchParams();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) {
        console.error("ユーザー取得エラー: ", error);
      } else {
        setUser(user);
      }
    };
    fetchUser();
  }, []);

  const handleJoinGroup = async () => {
    if (!user) {
      alert("ログインが必要です");
      return;
    }

    try {
      const { error } = await supabase.from("group_members").insert([
        {
          group_id: groupId,
          user_id: user.id,
          joined_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        throw error;
      }

      alert(`グループ ${groupId} に参加しました！`);
      router.replace("/");
    } catch (error) {
      console.error("グループ参加エラー: ", error);
      alert("グループ参加に失敗しました。");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>グループに参加</Text>
      <Text style={styles.info}>招待されたグループID: {groupId}</Text>
      <TouchableOpacity style={styles.buttonPrimary} onPress={handleJoinGroup}>
        <Text style={styles.buttonText}>参加する</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 20,
    paddingTop: 50,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
  },
  info: {
    fontSize: 16,
    color: "#555",
    marginBottom: 20,
  },
  buttonPrimary: {
    width: "100%",
    paddingVertical: 14,
    backgroundColor: "#007AFF",
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
