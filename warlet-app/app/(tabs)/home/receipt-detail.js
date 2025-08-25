import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../../lib/supabase";
import { Icon, ReceiptIcon, BackIcon } from "../../../lib/icons";

const ReceiptDetailScreen = ({ route }) => {
  const navigation = useNavigation();
  const { paymentId } = route.params;

  const [payment, setPayment] = useState(null);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReceiptDetail();
  }, [paymentId]);

  const fetchReceiptDetail = async () => {
    try {
      setLoading(true);

      const { data: paymentData, error: paymentError } = await supabase
        .from("payment_info")
        .select("*")
        .eq("id", paymentId)
        .single();

      if (paymentError) {
        console.error("支払い詳細取得エラー:", paymentError);
        setError("支払い詳細の取得に失敗しました");
        return;
      }

      const { data: eventData, error: eventError } = await supabase
        .from("event_info")
        .select("*")
        .eq("id", paymentData.event_id)
        .single();

      if (eventError) {
        console.error("イベント詳細取得エラー:", eventError);
        setError("イベント詳細の取得に失敗しました");
        return;
      }

      const { data: memberData, error: memberError } = await supabase
        .from("event_member")
        .select("user_id")
        .eq("event_id", paymentData.event_id);

      if (memberError) {
        console.error("メンバー取得エラー:", memberError);
        setError("メンバー情報の取得に失敗しました");
        return;
      }

      const userIds = memberData.map((m) => m.user_id);

      const { data: userData, error: userError } = await supabase
        .from("users_info")
        .select("id, account_name")
        .in("id", userIds);

      if (userError) {
        console.error("ユーザー情報取得エラー:", userError);
        setError("ユーザー情報の取得に失敗しました");
        return;
      }

      const eventWithMembers = {
        ...eventData,
        members: userData,
      };

      setPayment(paymentData);
      setEvent(eventWithMembers);
    } catch (err) {
      console.error("レシート詳細取得エラー:", err);
      setError("データの取得中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const getPayerName = () => {
    if (!event || !payment) {
      return "不明";
    }
    const payer = event.members.find(
      (member) => member.id === payment.payer_id
    );
    return payer ? payer.account_name : "不明";
  };

  const getSelectedMembersNames = () => {
    if (!event || !payment || !payment.selected_members) {
      return ["全メンバー"];
    }

    if (payment.selected_members.length === 0) {
      return ["全メンバー"];
    }

    const selectedNames = payment.selected_members.map((memberId) => {
      const member = event.members.find((m) => m.id === memberId);
      return member ? member.account_name : "不明";
    });

    return selectedNames;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3d547f" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.receiptCard}>
        <View style={styles.receiptHeader}>
          <Icon bgColor="#E8F4FD">
            <ReceiptIcon />
          </Icon>
          <View style={styles.receiptHeaderText}>
            <Text style={styles.receiptTitle}>{payment.note}</Text>
            <Text style={styles.receiptDate}>
              {formatDate(payment.created_at)}
            </Text>
          </View>
        </View>

        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>支払い金額</Text>
          <Text style={styles.amountValue}>
            ¥{payment.amount?.toLocaleString()}
          </Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>支払った人</Text>
          <Text style={styles.infoValue}>{getPayerName()}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>割り勘対象者</Text>
          <View style={styles.membersContainer}>
            {getSelectedMembersNames().map((name, index) => (
              <View key={index} style={styles.memberChip}>
                <Text style={styles.memberChipText}>{name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>一人あたりの負担額</Text>
          <Text style={styles.perPersonAmount}>
            ¥
            {Math.round(
              payment.amount / getSelectedMembersNames().length
            ).toLocaleString()}
          </Text>
        </View>

        {payment.memo && (
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>メモ</Text>
            <Text style={styles.memoText}>{payment.memo}</Text>
          </View>
        )}
      </View>

      <View style={styles.eventCard}>
        <Text style={styles.eventTitle}>イベント情報</Text>
        <View style={styles.eventInfo}>
          <Text style={styles.eventName}>{event.name}</Text>
          <Text style={styles.eventDate}>{formatDate(event.date)}</Text>
          <Text style={styles.eventMembers}>
            参加者: {event.members.length}人
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#d32f2f",
    textAlign: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  backButtonText: {
    color: "#3d547f",
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  receiptCard: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  receiptHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  receiptHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  receiptDate: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  amountSection: {
    alignItems: "center",
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#3d547f",
  },
  infoSection: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  membersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  memberChip: {
    backgroundColor: "#E8F4FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  memberChipText: {
    fontSize: 14,
    color: "#3d547f",
    fontWeight: "500",
  },
  perPersonAmount: {
    fontSize: 18,
    color: "#4caf50",
    fontWeight: "600",
  },
  memoText: {
    fontSize: 16,
    color: "#333",
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
  },
  eventCard: {
    backgroundColor: "#fff",
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  eventInfo: {
    gap: 4,
  },
  eventName: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  eventDate: {
    fontSize: 14,
    color: "#666",
  },
  eventMembers: {
    fontSize: 14,
    color: "#666",
  },
});

export default ReceiptDetailScreen;
