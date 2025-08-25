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
  RefreshControl,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { supabase } from "../../../lib/supabase";
import { getUserIdFromAuthId } from "../../utils/utils";
import { Icon, PaymentIcon, ReceiveIcon, SendIcon } from "../../../lib/icons";

const PaymentStatusScreen = () => {
  const navigation = useNavigation();
  const [currentTab, setCurrentTab] = useState("pending");
  const [payments, setPayments] = useState([]);
  const [userMapping, setUserMapping] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);


  const fetchPaymentsAndUsers = async () => {
    try {
      setLoading(true);
      const id = await getUserIdFromAuthId();
      setCurrentUserId(id);

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("transaction_info")
        .select("*")
        .or(`from_user.eq.${id},to_user.eq.${id}`)
        .order("created_at", { ascending: false });

      if (paymentsError) {
        console.error("支払い情報取得エラー:", paymentsError);
        setLoading(false);
        return;
      }
      setPayments(paymentsData);

 
      const userIds = new Set();
      paymentsData.forEach((payment) => {
        if (payment.from_user) {
          userIds.add(payment.from_user);
        }
        if (payment.to_user) {
          userIds.add(payment.to_user);
        }
      });
      const uniqueUserIds = Array.from(userIds);

      const { data: usersData, error: usersError } = await supabase
        .from("users_info")
        .select("id, account_name")
        .in("id", uniqueUserIds);

      if (usersError) {
        console.error("ユーザー情報取得エラー:", usersError);
      } else {
        const mapping = {};
        usersData.forEach((user) => {
          mapping[user.id] = user.account_name;
        });
        setUserMapping(mapping);
      }
      setLoading(false);
    } catch (err) {
      console.error("fetchPaymentsAndUsers エラー:", err);
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPaymentsAndUsers();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPaymentsAndUsers();
    setRefreshing(false);
  };


  const filteredPayments = payments.filter(
    (payment) => payment.status === currentTab
  );


  const paymentsYouPay = filteredPayments.filter(
    (payment) => payment.from_user === currentUserId
  );
  const paymentsYouReceive = filteredPayments.filter(
    (payment) => payment.to_user === currentUserId
  );

  const renderPaymentItem = ({ item, index }) => {
    const isFromUser = item.from_user === currentUserId;
    const otherUserId = isFromUser ? item.to_user : item.from_user;
    const otherUserName = userMapping[otherUserId] || `ユーザー${otherUserId}`;

    return (
      <TouchableOpacity
        style={styles.paymentItem}
        onPress={() =>
          navigation.navigate("payment-overview", {
            transactionId: item.id,
            event_id: item.event_id,
            from_user: item.from_user,
            to_user: item.to_user,
            amount: item.amount,
          })
        }
        activeOpacity={0.7}
      >
        <Icon bgColor={isFromUser ? "#FFE5E5" : "#E5FFE5"}>
          {isFromUser ? <SendIcon /> : <ReceiveIcon />}
        </Icon>
        <View style={styles.paymentContent}>
          <Text style={styles.paymentTitle}>
            {isFromUser
              ? `${otherUserName}に支払い`
              : `${otherUserName}から受け取り`}
          </Text>
          <Text style={styles.paymentDate}>
            {new Date(item.created_at).toLocaleDateString("ja-JP")}
          </Text>
        </View>
        <View style={styles.amountContainer}>
          <Text
            style={[
              styles.amountText,
              isFromUser ? styles.payAmount : styles.receiveAmount,
            ]}
          >
            ¥{item.amount?.toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const TabButton = ({ id, title, isActive, onPress }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.activeTabButton]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[styles.tabButtonText, isActive && styles.activeTabButtonText]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>支払状況</Text>
        <View style={styles.tabContainer}>
          <TabButton
            id="pending"
            title="支払待ち"
            isActive={currentTab === "pending"}
            onPress={() => setCurrentTab("pending")}
          />
          <TabButton
            id="checking"
            title="確認待ち"
            isActive={currentTab === "checking"}
            onPress={() => setCurrentTab("checking")}
          />
          <TabButton
            id="completed"
            title="支払済み"
            isActive={currentTab === "completed"}
            onPress={() => setCurrentTab("completed")}
          />
        </View>
      </View>

 
      <View style={styles.contentContainer}>
        <View style={styles.halfSection}>
          <Text style={styles.sectionSubTitle}>
            あなたが支払う ({paymentsYouPay.length})
          </Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3d547f" />
            </View>
          ) : paymentsYouPay.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon bgColor="#FFE5E5">
                <SendIcon />
              </Icon>
              <Text style={styles.emptyText}>支払いはありません</Text>
            </View>
          ) : (
            <FlatList
              data={paymentsYouPay}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderPaymentItem}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        <View style={styles.halfSection}>
          <Text style={styles.sectionSubTitle}>
            あなたが受け取る ({paymentsYouReceive.length})
          </Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3d547f" />
            </View>
          ) : paymentsYouReceive.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon bgColor="#E5FFE5">
                <ReceiveIcon />
              </Icon>
              <Text style={styles.emptyText}>受け取りはありません</Text>
            </View>
          ) : (
            <FlatList
              data={paymentsYouReceive}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderPaymentItem}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
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
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#3d547f",
    marginBottom: 16,
    marginTop: 16,
  },
  sectionSubTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3d547f",
    marginBottom: 12,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    width: 40,
    height: 40,
    flexShrink: 0,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f8f9fc",
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  activeTabButton: {
    backgroundColor: "#3d547f",
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6a7581",
  },
  activeTabButtonText: {
    color: "#fff",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  halfSection: {
    flex: 1,
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
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
  paymentItem: {
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
  paymentContent: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#121416",
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 14,
    color: "#6a7581",
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 16,
    fontWeight: "600",
  },
  payAmount: {
    color: "#dc3545",
  },
  receiveAmount: {
    color: "#28a745",
  },
});

export default PaymentStatusScreen;
