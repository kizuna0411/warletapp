import React, { useState, useEffect, useLayoutEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { getUserIdFromAuthId } from "../../utils/utils";
import { calculateSplit } from "../../utils/calc";
import { useNavigation } from "@react-navigation/native";
import { Icon, ReceiptIcon, MoneyIcon, AddIcon } from "../../../lib/icons";

export default function AddReceiptScreen({ route }) {
  const { eventId } = route?.params || {};
  const router = useRouter();
  const navigation = useNavigation();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      console.log("fetchMembers: イベントID", eventId, "のメンバー取得開始");
      try {
        const { data: memberData, error: memberError } = await supabase
          .from("event_member")
          .select("user_id")
          .eq("event_id", eventId);
        if (memberError) {
          throw memberError;
        }
        if (!memberData || memberData.length === 0) {
          console.log("fetchMembers: 該当イベントのメンバーが存在しません");
          setMembers([]);
          return;
        }
        const userIds = memberData.map((item) => item.user_id);
        const { data: userData, error: userError } = await supabase
          .from("users_info")
          .select("id, account_name")
          .in("id", userIds);
        if (userError) {
          throw userError;
        }
        setMembers(userData || []);
      } catch (error) {
        console.error("メンバー取得エラー:", error);
        setError(true);
      } finally {
        setLoading(false);
        console.log("fetchMembers: メンバー取得処理終了");
      }
    };

    fetchMembers();
  }, [eventId]);

  const handleAddReceipt = async () => {
    console.log(
      "handleAddReceipt: 開始。入力内容 -> description:",
      description,
      "amount:",
      amount
    );
    if (!description.trim()) {
      alert("費用項目を入力してください");
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert("正しい金額を入力してください");
      return;
    }
    if (members.length === 0) {
      alert("このイベントには参加者がいません");
      return;
    }

    try {
      const userId = await getUserIdFromAuthId();
      console.log("handleAddReceipt: 取得したユーザーID:", userId);

      const { data, error: paymentError } = await supabase
        .from("payment_info")
        .insert([
          {
            event_id: eventId,
            payer_id: userId,
            amount: Number(amount),
            note: description,
          },
        ])
        .select("id")
        .single();
      if (paymentError) {
        throw paymentError;
      }

      alert("支払いが追加され、割り勘の計算が完了しました");
      router.back();
    } catch (error) {
      console.error("支払い追加エラー:", error);
      alert("支払いの追加に失敗しました。");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={80}
    >
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>支払い内容</Text>
            <View style={styles.inputCard}>
              <Icon bgColor="#E5F3FF">
                <ReceiptIcon />
              </Icon>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>支払ったもの</Text>
                <TextInput
                  style={styles.input}
                  placeholder="例: 高速代、ホテル代"
                  value={description}
                  onChangeText={setDescription}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>金額</Text>
            <View style={styles.inputCard}>
              <Icon bgColor="#FFE5E5">
                <MoneyIcon />
              </Icon>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>支払い金額</Text>
                <View style={styles.amountInputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={(text) =>
                      setAmount(text.replace(/[^0-9]/g, ""))
                    }
                  />
                  <Text style={styles.currencyLabel}>円</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                割り勘する相手を選択 ({selectedMembers.length}/{members.length}
                人)
              </Text>
              <TouchableOpacity
                style={styles.toggleAllButton}
                onPress={toggleAllMembers}
              >
                <Text style={styles.toggleAllText}>
                  {selectedMembers.length === members.length
                    ? "全員解除"
                    : "全員選択"}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>
              この支払いを割り勘したい相手を選んでください
            </Text>
            <View style={styles.membersContainer}>
              {members.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.memberCard,
                    selectedMembers.includes(member.id) &&
                      styles.memberCardSelected,
                  ]}
                  onPress={() => toggleMemberSelection(member.id)}
                >
                  <Icon
                    bgColor={
                      selectedMembers.includes(member.id)
                        ? "#E5F3FF"
                        : "#F8F9FA"
                    }
                  >
                    <PersonIcon />
                  </Icon>
                  <View style={styles.memberInfo}>
                    <Text
                      style={[
                        styles.memberName,
                        selectedMembers.includes(member.id) &&
                          styles.memberNameSelected,
                      ]}
                    >
                      {member.account_name}
                    </Text>
                    <Text style={styles.perPersonCost}>
                      1人あたり: ¥
                      {amount && selectedMembers.length > 0
                        ? Math.round(
                            Number(amount) / selectedMembers.length
                          ).toLocaleString()
                        : "0"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      selectedMembers.includes(member.id) &&
                        styles.checkboxSelected,
                    ]}
                  >
                    {selectedMembers.includes(member.id) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.fixedButtonContainer}>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={handleAddReceipt}
          >
            <AddIcon />
            <Text style={styles.buttonText}>
              {selectedMembers.length === 0
                ? "支払いを追加（相手を選択してください）"
                : `支払いを追加 (${selectedMembers.length}人で割り勘)`}
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
    flex: 1,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  currencyLabel: {
    fontSize: 16,
    color: "#6a7581",
    marginLeft: 8,
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
