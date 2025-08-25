import React, {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Pressable,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { supabase } from "../../../lib/supabase";
import { Swipeable } from "react-native-gesture-handler";
import { calculateSplit } from "../../utils/calc";
import { getUserIdFromAuthId, fetchGroupsById } from "../../utils/utils";
import {
  Icon,
  EventIcon,
  ReceiptIcon,
  AddIcon,
  TrashIcon,
  iconColors,
} from "../../../lib/icons";

const EventScreen = ({ route }) => {
  const navigation = useNavigation();
  const eventId = route?.params?.eventId;

  console.log("eventId@:", eventId);

  const [event, setEvent] = useState({
    id: "unknown",
    name: "不明なイベント",
    date: "----/--/--",
    members: [],
  });
  const [payments, setPayments] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isUserMember, setIsUserMember] = useState(false);
  const [splitConfirmed, setSplitConfirmed] = useState(false);

  const fetchEventDetails = async () => {
    console.log("🔄 fetchEventDetails開始, eventId:", eventId);
    try {
      const { data: eventData, error: eventError } = await supabase
        .from("event_info")
        .select("id, name, date, group_id, status")
        .eq("id", eventId)
        .single();

      if (eventError) {
        console.error("イベント取得エラー: ", eventError);
        setError(true);
        return;
      }
      console.log("eventData:", eventData);

      const { data: memberData, error: memberError } = await supabase
        .from("event_member")
        .select("user_id")
        .eq("event_id", eventId);

      if (memberError) {
        console.error("メンバー取得エラー:", memberError);
        setError(true);
        return;
      }

      const userIds = memberData.map((m) => m.user_id);
      console.log("参加者 user_ids:", userIds);
      console.log("memberData:", memberData);

      if (userIds.length === 0) {
        console.warn("⚠️ event_memberテーブルにデータがありません");
        setEvent({
          id: eventData.id,
          name: eventData.name || "不明なイベント",
          date: eventData.date || "----/--/--",
          members: [],
        });
        setError(false);
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users_info")
        .select("id, account_name")
        .in("id", userIds);

      if (userError) {
        console.error("ユーザー情報取得エラー:", userError);
        setError(true);
        return;
      }
      console.log("取得したメンバー:", userData);
      console.log("userData length:", userData?.length);

      if (!userData || userData.length === 0) {
        console.warn(
          "⚠️ users_infoテーブルから該当するユーザーが見つかりません"
        );
      }

      setEvent({
        id: eventData.id,
        name: eventData.name || "不明なイベント",
        date: eventData.date || "----/--/--",
        members: userData || [],
      });

      const currentUserId = await getUserIdFromAuthId();
      setUserId(currentUserId);
      setIsUserMember(userIds.includes(currentUserId));
      setSplitConfirmed(eventData.status === "confirmed");
    } catch (error) {
      console.error("イベント情報取得中にエラー:", error);
      setError(true);
    }
  };

  const fetchPayments = async () => {
    try {
      console.log("📥 fetchPayments: 支払いデータ取得開始");

      const { data: paymentData, error: paymentError } = await supabase
        .from("payment_info")
        .select("id, payer_id, amount, event_id, note, selected_members")
        .eq("event_id", eventId);

      if (paymentError) {
        console.error("❌ 支払いデータ取得エラー: ", paymentError);
        return;
      }

      if (!paymentData || paymentData.length === 0) {
        console.log("ℹ️ 支払いデータが存在しません");
        setPayments([]);
        return;
      }

      console.log("✅ 支払いデータ取得成功: ", paymentData);

      paymentData.forEach((payment, index) => {
        console.log(`💳 Payment ${index + 1}:`, {
          id: payment.id,
          amount: payment.amount,
          selected_members: payment.selected_members,
          selected_members_type: typeof payment.selected_members,
          selected_members_length: payment.selected_members?.length,
        });
      });

      setPayments(paymentData);
      console.log("✅ fetchPayments完了");
    } catch (error) {
      console.error("支払いデータ取得中に例外が発生:", error);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    await fetchEventDetails();
    await fetchPayments();
    setLoading(false);
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  useEffect(() => {
    console.log("🧮 calculatePayments実行開始");
    console.log("event:", event);
    console.log("event.members:", event.members);
    console.log("payments:", payments);

    if (event.id === "unknown") {
      console.log("⚠️ イベントIDが不明のため計算をスキップ");
      return;
    }

    if (!event.members || event.members.length === 0) {
      console.log("⚠️ メンバー情報がないため計算をスキップ");
      return;
    }

    const paymentMap = {};
    event.members.forEach((member) => {
      paymentMap[member.id] = 0;
    });

    payments.forEach((payment) => {
      const selectedMembers =
        payment.selected_members && payment.selected_members.length > 0
          ? payment.selected_members
          : event.members.map((m) => m.id);

      console.log(
        `💳 支払い処理: 金額=${payment.amount}, 支払者=${payment.payer_id}, 選択メンバー=`,
        selectedMembers
      );

      if (paymentMap.hasOwnProperty(payment.payer_id)) {
        paymentMap[payment.payer_id] += payment.amount;
      }

      const sharePerPerson = payment.amount / selectedMembers.length;
      selectedMembers.forEach((memberId) => {
        if (paymentMap.hasOwnProperty(memberId)) {
          paymentMap[memberId] -= sharePerPerson;
        }
      });
    });

    console.log("最終的な paymentMap:", paymentMap);

    const result = event.members.map((member) => ({
      name: member.account_name,
      balance: paymentMap[member.id] || 0,
    }));

    console.log("精算結果 (selected_members考慮):", result);
    setBalances(result);
  }, [event, payments]);

  const handleDeletePayment = async (paymentId) => {
    try {
      const { error } = await supabase
        .from("payment_info")
        .delete()
        .eq("id", paymentId);
      if (error) {
        console.error("支払い削除エラー:", error);
        alert("削除に失敗しました。");
        return;
      }
      setPayments((prev) => prev.filter((payment) => payment.id !== paymentId));
    } catch (err) {
      console.error("削除中にエラー:", err);
      alert("削除に失敗しました。");
    }
  };

  const confirmDeletePayment = (paymentId) => {
    Alert.alert(
      "削除の確認",
      "この支払い記録を削除してもよろしいですか？",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => handleDeletePayment(paymentId),
        },
      ],
      { cancelable: true }
    );
  };

  const renderRightActions = (paymentId) => {
    return (
      <TouchableOpacity
        style={styles.swipeDeleteButton}
        onPress={() => confirmDeletePayment(paymentId)}
      >
        <TrashIcon />
      </TouchableOpacity>
    );
  };

  const handleConfirmSplit = async () => {
    try {
      const { error: updateError } = await supabase
        .from("event_info")
        .update({ status: "confirmed" })
        .eq("id", eventId);

      if (updateError) {
        console.error("支払い確定ステータス更新エラー:", updateError);
        Alert.alert("エラー", "支払い確定のステータス変更に失敗しました。");
        return;
      }

      const transactions = await calculateSplit(eventId);
      console.log("calculateSplit の結果:", transactions);
      Alert.alert("完了", "割り勘が確定されました！");
      setSplitConfirmed(true);
    } catch (error) {
      console.error("割り勘確定エラー:", error);
      Alert.alert("エラー", "割り勘の確定に失敗しました。");
    }
  };

  const handleCancelSplit = async () => {
    try {
      const { error: updateError } = await supabase
        .from("event_info")
        .update({ status: "pending" })
        .eq("id", eventId);

      if (updateError) {
        console.error("支払い確定取り消しステータス更新エラー:", updateError);
        Alert.alert(
          "エラー",
          "支払い確定取り消しのステータス変更に失敗しました。"
        );
        return;
      }

      const { error } = await supabase
        .from("transaction_info")
        .delete()
        .eq("event_id", eventId);

      if (error) {
        console.error("割り勘取消しエラー:", error);
        Alert.alert("エラー", "割り勘の取消しに失敗しました。");
      } else {
        Alert.alert("完了", "割り勘が取消されました！");
        setSplitConfirmed(false);
      }
    } catch (error) {
      console.error("割り勘取消し例外エラー:", error);
      Alert.alert("エラー", "割り勘取消し中にエラーが発生しました。");
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: event.name,
    });
  }, [navigation, event.name]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3d547f" />
        <Text style={styles.loadingText}>{event.name} を読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>イベント情報</Text>
          <View style={styles.infoCard}>
            <Icon bgColor="#E5F3FF">
              <EventIcon />
            </Icon>
            <View style={styles.infoContent}>
              <Text style={styles.eventName}>{event.name}</Text>
              <Text style={styles.eventDate}>{event.date}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>合計金額</Text>
          <View style={styles.totalAmountCard}>
            <Icon bgColor="#FFE5E5">
              <Text style={styles.yenIcon}>¥</Text>
            </Icon>
            <View style={styles.totalContent}>
              <Text style={styles.totalLabel}>このイベントでの総支払額</Text>
              <Text style={styles.totalAmount}>
                ¥
                {payments
                  .reduce((sum, payment) => sum + payment.amount, 0)
                  .toLocaleString()}
              </Text>
            </View>
          </View>

          {error && (
            <Text style={styles.errorText}>⚠️ データ取得に失敗しました</Text>
          )}

          {!isUserMember && (
            <Text style={styles.errorText}>
              ※あなたはこのイベントに参加していません。
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>精算結果</Text>
          {balances.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon bgColor="#FFE5E5">
                <ReceiptIcon />
              </Icon>
              <Text style={styles.emptyText}>まだ精算結果がありません</Text>
            </View>
          ) : (
            <View style={styles.resultContainer}>
              {balances.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.resultItem,
                    item.balance === 0
                      ? styles.zeroResultItem
                      : item.balance > 0
                        ? styles.positiveResultItem
                        : styles.negativeResultItem,
                  ]}
                >
                  <View style={styles.resultLeft}>
                    <Text style={styles.resultName}>{item.name}</Text>
                  </View>
                  <View style={styles.resultRight}>
                    <Text
                      style={[
                        styles.resultBalance,
                        item.balance === 0
                          ? styles.zeroBalance
                          : item.balance > 0
                            ? styles.positiveBalance
                            : styles.negativeBalance,
                      ]}
                    >
                      {item.balance === 0
                        ? "¥0"
                        : item.balance > 0
                          ? `+¥${Math.abs(item.balance).toLocaleString()}`
                          : `-¥${Math.abs(item.balance).toLocaleString()}`}
                    </Text>
                    <Text
                      style={[
                        styles.balanceLabel,
                        item.balance === 0
                          ? styles.zeroLabel
                          : item.balance > 0
                            ? styles.positiveLabel
                            : styles.negativeLabel,
                      ]}
                    >
                      {item.balance === 0
                        ? "精算済み"
                        : item.balance > 0
                          ? "受取り"
                          : "支払い"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            支払い記録 ({payments.length})
          </Text>
          {payments.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon bgColor="#FFE5E5">
                <ReceiptIcon />
              </Icon>
              <Text style={styles.emptyText}>支払い記録がありません</Text>
            </View>
          ) : (
            <FlatList
              data={payments}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              renderItem={({ item, index }) => {
                const payerName = event.members.find(
                  (member) => member.id === item.payer_id
                )?.account_name;
                return (
                  <Swipeable
                    renderRightActions={() => renderRightActions(item.id)}
                  >
                    <TouchableOpacity
                      style={styles.paymentItem}
                      onPress={() =>
                        navigation.navigate("receipt-detail", {
                          paymentId: item.id,
                        })
                      }
                    >
                      <Icon bgColor={iconColors[index % iconColors.length]}>
                        <ReceiptIcon />
                      </Icon>
                      <View style={styles.paymentContent}>
                        <Text style={styles.paymentTitle}>
                          {payerName} が {item.note} を支払い
                        </Text>
                        <Text style={styles.paymentAmount}>
                          ¥{item.amount?.toLocaleString()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </Swipeable>
                );
              }}
            />
          )}
        </View>
      </ScrollView>

      <View style={styles.fixedButtonContainer}>
        {splitConfirmed ? (
          <TouchableOpacity
            style={[
              styles.buttonDanger,
              !isUserMember && styles.disabledButton,
            ]}
            onPress={isUserMember ? handleCancelSplit : null}
            disabled={!isUserMember}
          >
            <Text style={styles.buttonText}>支払い確定取り消し</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.buttonPrimary,
              !isUserMember && styles.disabledButton,
            ]}
            onPress={isUserMember ? handleConfirmSplit : null}
            disabled={!isUserMember}
          >
            <Text style={styles.buttonText}>支払い確定</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.buttonSecondary,
            !isUserMember && styles.disabledButton,
          ]}
          onPress={() =>
            navigation.navigate("addreceiptadvanced", { eventId: event.id })
          }
          disabled={!isUserMember}
        >
          <AddIcon />
          <Text style={styles.buttonText}>割り勘追加</Text>
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
  contentContainer: {
    paddingBottom: 150,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
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
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#3d547f",
    marginBottom: 12,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#f1f2f4",
    marginBottom: 12,
  },
  infoContent: {
    flex: 1,
  },
  eventName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#121416",
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: "#6a7581",
  },
  errorText: {
    fontSize: 14,
    color: "#dc3545",
    textAlign: "center",
    marginTop: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#8B9DC3",
    textAlign: "center",
    marginTop: 12,
  },
  resultContainer: {
    gap: 6,
  },
  resultItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f1f2f4",
  },
  positiveResultItem: {
    borderLeftWidth: 3,
    borderLeftColor: "#28a745",
    backgroundColor: "#f8fff9",
  },
  negativeResultItem: {
    borderLeftWidth: 3,
    borderLeftColor: "#dc3545",
    backgroundColor: "#fff8f8",
  },
  zeroResultItem: {
    borderLeftWidth: 3,
    borderLeftColor: "#6c757d",
    backgroundColor: "#f8f9fa",
  },
  resultLeft: {
    flex: 1,
  },
  resultRight: {
    alignItems: "flex-end",
  },
  resultName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#121416",
  },
  resultBalance: {
    fontSize: 16,
    fontWeight: "700",
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  positiveBalance: {
    color: "#28a745",
  },
  negativeBalance: {
    color: "#dc3545",
  },
  zeroBalance: {
    color: "#6c757d",
  },
  positiveLabel: {
    color: "#28a745",
  },
  negativeLabel: {
    color: "#dc3545",
  },
  zeroLabel: {
    color: "#6c757d",
  },
  paymentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    marginBottom: 6,
    borderRadius: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: "#f1f2f4",
  },
  paymentContent: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#121416",
    marginBottom: 2,
  },
  paymentAmount: {
    fontSize: 13,
    color: "#6a7581",
  },
  fixedButtonContainer: {
    position: "absolute",
    bottom: 34,
    left: 16,
    right: 16,
    gap: 12,
  },
  buttonPrimary: {
    width: "100%",
    paddingVertical: 16,
    backgroundColor: "#3d547f",
    borderRadius: 16,
    alignItems: "center",
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
  buttonSecondary: {
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
  buttonDanger: {
    width: "100%",
    paddingVertical: 16,
    backgroundColor: "#dc3545",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#dc3545",
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
  disabledButton: {
    backgroundColor: "#ddd",
    shadowOpacity: 0,
    elevation: 0,
  },
  totalAmountCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    gap: 16,
    borderWidth: 1,
    borderColor: "#f1f2f4",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalContent: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 14,
    color: "#6a7581",
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#3d547f",
    marginBottom: 4,
  },
  perPersonAmount: {
    fontSize: 14,
    color: "#8B9DC3",
  },
  yenIcon: {
    fontSize: 18,
    fontWeight: "600",
    color: "#dc3545",
  },
  swipeDeleteButton: {
    backgroundColor: "#dc3545",
    justifyContent: "center",
    alignItems: "center",
    width: 60,
    height: "90%",
    borderRadius: 8,
  },
  deleteButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default EventScreen;
