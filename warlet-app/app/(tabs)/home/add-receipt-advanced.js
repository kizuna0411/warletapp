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
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { getUserIdFromAuthId } from "../../utils/utils";
import { useNavigation } from "@react-navigation/native";
import {
  Icon,
  ReceiptIcon,
  MoneyIcon,
  AddIcon,
  PersonIcon,
} from "../../../lib/icons";

export default function AddReceiptAdvancedScreen({ route }) {
  const { eventId } = route?.params || {};
  const router = useRouter();
  const navigation = useNavigation();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
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

        setSelectedMembers(userData?.map((user) => user.id) || []);
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

  const toggleMemberSelection = (memberId) => {
    setSelectedMembers((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const handleAddReceipt = async () => {
    console.log(
      "handleAddReceipt: 開始。入力内容 -> description:",
      description,
      "amount:",
      amount,
      "selectedMembers:",
      selectedMembers
    );

    if (!description.trim()) {
      Alert.alert("入力エラー", "費用項目を入力してください");
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("入力エラー", "正しい金額を入力してください");
      return;
    }
    if (selectedMembers.length === 0) {
      Alert.alert(
        "選択エラー",
        "最低でも1人は割り勘する相手を選択してください"
      );
      return;
    }

    try {
      const userId = await getUserIdFromAuthId();
      console.log("handleAddReceipt: 取得したユーザーID:", userId);

      console.log(
        "保存するselected_members:",
        selectedMembers,
        "形式:",
        selectedMembers.length > 0 ? "UUID配列" : "空配列"
      );

      const selectedMembersArray =
        selectedMembers.length > 0 ? selectedMembers : null;

      const { data, error: paymentError } = await supabase
        .from("payment_info")
        .insert([
          {
            event_id: eventId,
            payer_id: userId,
            amount: Number(amount),
            note: description,
            selected_members: selectedMembersArray,
          },
        ])
        .select("*")
        .single();
      if (paymentError) {
        throw paymentError;
      }

      console.log("保存されたpayment_info:", data);
      console.log("保存されたselected_members:", data?.selected_members);

      Alert.alert(
        "完了",
        `支払いが追加されました（${selectedMembers.length}人で割り勘）`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("支払い追加エラー:", error);
      Alert.alert(
        "エラー",
        "支払いの追加に失敗しました。もう一度お試しください。"
      );
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
            <Text style={styles.sectionTitle}>
              割り勘する相手を選択 ({selectedMembers.length}/{members.length}人)
            </Text>
            <Text style={styles.helperText}>
              この支払いを割り勘したい相手を選んでください
            </Text>

            <View style={styles.quickActionContainer}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => setSelectedMembers(members.map((m) => m.id))}
              >
                <Text style={styles.quickActionText}>全員選択</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => setSelectedMembers([])}
              >
                <Text style={styles.quickActionText}>全員解除</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.compactMembersContainer}>
              {members.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.memberChip,
                    selectedMembers.includes(member.id) &&
                      styles.memberChipSelected,
                  ]}
                  onPress={() => toggleMemberSelection(member.id)}
                >
                  <Text
                    style={[
                      styles.memberChipText,
                      selectedMembers.includes(member.id) &&
                        styles.memberChipTextSelected,
                    ]}
                  >
                    {member.account_name}
                  </Text>
                  <View style={styles.memberChipCheckContainer}>
                    {selectedMembers.includes(member.id) ? (
                      <Text style={styles.memberChipCheck}>✓</Text>
                    ) : (
                      <Text style={styles.memberChipCheckPlaceholder}> </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {selectedMembers.length > 0 && amount && (
              <View style={styles.perPersonDisplay}>
                <Text style={styles.perPersonText}>
                  1人あたり: ¥
                  {Math.round(
                    Number(amount) / selectedMembers.length
                  ).toLocaleString()}
                </Text>
              </View>
            )}
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
    marginBottom: 16,
  },
  membersContainer: {
    gap: 8,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#f1f2f4",
  },
  memberCardSelected: {
    borderColor: "#3d547f",
    backgroundColor: "#F8F9FF",
  },
  quickActionContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  quickActionButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#f1f2f4",
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
    minHeight: 44,
  },
  quickActionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3d547f",
  },
  compactMembersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f1f2f4",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    gap: 6,
    minHeight: 44,
  },
  memberChipSelected: {
    backgroundColor: "#E5F3FF",
    borderColor: "#3d547f",
  },
  memberChipText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6a7581",
  },
  memberChipTextSelected: {
    color: "#3d547f",
    fontWeight: "600",
  },
  memberChipCheckContainer: {
    width: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  memberChipCheck: {
    fontSize: 14,
    color: "#3d547f",
    fontWeight: "bold",
  },
  memberChipCheckPlaceholder: {
    fontSize: 14,
    color: "transparent",
    fontWeight: "bold",
  },
  perPersonDisplay: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  perPersonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3d547f",
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
