import React, { useState, useEffect, useLayoutEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../../lib/supabase";
import { getUserIdFromAuthId } from "../../utils/utils";
import * as Clipboard from "expo-clipboard";
import {
  Icon,
  EventIcon,
  BankIcon,
  CashlessIcon,
  CopyIcon,
  MoneyIcon,
} from "../../../lib/icons";
import Svg, { Path } from "react-native-svg";

const StatusIcon = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case "pending":
        return "#ffc107";
      case "checking":
        return "#17a2b8";
      case "completed":
        return "#28a745";
      default:
        return "#6c757d";
    }
  };

  return (
    <Svg width="20" height="20" viewBox="0 0 256 256" fill="none">
      <Path
        d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z"
        fill={getStatusColor()}
      />
    </Svg>
  );
};

export default function PaymentOverviewScreen({ route }) {
  const { transactionId, event_id, from_user, to_user, amount } = route.params;
  const navigation = useNavigation();

  const [eventInfo, setEventInfo] = useState(null);
  const [partnerPaymentSettings, setPartnerPaymentSettings] = useState(null);
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const fetchOverviewData = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const userId = await getUserIdFromAuthId();
        if (!userId) {
          setErrorMsg("ユーザーIDの取得に失敗しました。");
          setLoading(false);
          return;
        }
        setCurrentUserId(userId);
        const partnerUserId = userId === from_user ? to_user : from_user;

        const { data: eventData, error: eventError } = await supabase
          .from("event_info")
          .select("id, name, date")
          .eq("id", event_id)
          .single();
        if (eventError) {
          console.error("イベント情報取得エラー:", eventError);
          setErrorMsg("イベント情報の取得に失敗しました。");
        } else {
          setEventInfo(eventData);
        }

        const { data: paymentSettingsData, error: paymentSettingsError } =
          await supabase
            .from("payment_setting")
            .select("*")
            .eq("user_id", partnerUserId)
            .single();
        if (paymentSettingsError) {
          console.log("決済情報取得エラー:", paymentSettingsError);
        } else {
          setPartnerPaymentSettings(paymentSettingsData);
        }

        const { data: transactionData, error: transactionError } =
          await supabase
            .from("transaction_info")
            .select("status")
            .eq("id", transactionId)
            .single();
        if (transactionError) {
          console.error("取引情報取得エラー:", transactionError);
        } else {
          setTransactionStatus(transactionData.status);
        }
      } catch (error) {
        console.error("データ取得エラー:", error);
        setErrorMsg("データ取得中にエラーが発生しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, [event_id, from_user, to_user, transactionId]);

  const handleComplete = async () => {
    if (!currentUserId) {
      return;
    }
    const newStatus =
      currentUserId === from_user && transactionStatus === "pending"
        ? "checking"
        : currentUserId === to_user && transactionStatus === "pending"
          ? "completed"
          : null;

    if (!newStatus) {
      Alert.alert(
        "無効な操作",
        "この操作は現在のステータスでは実行できません。"
      );
      return;
    }

    try {
      const { error } = await supabase
        .from("transaction_info")
        .update({ status: newStatus })
        .eq("id", transactionId);
      if (error) {
        console.error("送金完了エラー:", error);
        Alert.alert("エラー", "送金完了に失敗しました: " + error.message);
      } else {
        Alert.alert("完了", "送金が完了しました！");
        navigation.goBack();
      }
    } catch (err) {
      console.error("送金完了例外エラー:", err);
      Alert.alert("エラー", "送金完了中にエラーが発生しました。");
    }
  };

  const handleCancelTransaction = async () => {
    try {
      const { error } = await supabase
        .from("transaction_info")
        .update({ status: "pending" })
        .eq("id", transactionId);
      if (error) {
        console.error("送金取り消しエラー:", error);
        Alert.alert("エラー", "送金取り消しに失敗しました: " + error.message);
      } else {
        Alert.alert("完了", "送金が取り消されました！");
        navigation.goBack();
      }
    } catch (err) {
      console.error("送金取り消し例外エラー:", err);
      Alert.alert("エラー", "送金取り消し中にエラーが発生しました。");
    }
  };

  const handleConfirmTransaction = async () => {
    try {
      const { error } = await supabase
        .from("transaction_info")
        .update({ status: "completed" })
        .eq("id", transactionId);
      if (error) {
        console.error("確認完了エラー:", error);
        Alert.alert("エラー", "確認完了に失敗しました: " + error.message);
      } else {
        Alert.alert("完了", "送金確認が完了しました！");
        navigation.goBack();
      }
    } catch (err) {
      console.error("確認完了例外エラー:", err);
      Alert.alert("エラー", "確認完了中にエラーが発生しました。");
    }
  };

  const handleRevertToCheck = async () => {
    try {
      const { error } = await supabase
        .from("transaction_info")
        .update({ status: "checking" })
        .eq("id", transactionId);
      if (error) {
        console.error("確認取り消しエラー:", error);
        Alert.alert("エラー", "確認取り消しに失敗しました: " + error.message);
      } else {
        Alert.alert("完了", "確認を取り消しました！");
        navigation.goBack();
      }
    } catch (err) {
      console.error("確認取り消し例外エラー:", err);
      Alert.alert("エラー", "確認取り消し中にエラーが発生しました。");
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "支払待ち";
      case "checking":
        return "確認待ち";
      case "completed":
        return "支払済み";
      default:
        return "不明";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "#ffc107";
      case "checking":
        return "#17a2b8";
      case "completed":
        return "#28a745";
      default:
        return "#6c757d";
    }
  };

  const handleCopy = async (text, label) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("コピー完了", `${label}をコピーしました`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3d547f" />
        <Text style={styles.loadingText}>詳細を読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {errorMsg !== "" && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>イベント情報</Text>
          {eventInfo ? (
            <View style={styles.infoCard}>
              <Icon bgColor="#E5F3FF">
                <EventIcon />
              </Icon>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>{eventInfo.name}</Text>
                <Text style={styles.infoSubtitle}>
                  {new Date(eventInfo.date).toLocaleDateString("ja-JP")}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon bgColor="#FFE5E5">
                <EventIcon />
              </Icon>
              <Text style={styles.emptyText}>
                イベント情報が取得できませんでした
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>送金額</Text>
          <View style={styles.amountCard}>
            <Text style={styles.amountText}>¥{amount?.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>支払い先情報</Text>
          {partnerPaymentSettings ? (
            <>
              {partnerPaymentSettings.paypay_id && (
                <View style={styles.paymentInfoCard}>
                  <Icon bgColor="#d6a3a3">
                    <CashlessIcon />
                  </Icon>
                  <View style={styles.paymentInfoContent}>
                    <Text style={styles.paymentInfoTitle}>PayPay ID</Text>
                    <Text style={styles.paymentInfoValue}>
                      {partnerPaymentSettings.paypay_id}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() =>
                      handleCopy(partnerPaymentSettings.paypay_id, "PayPay ID")
                    }
                  >
                    <CopyIcon />
                  </TouchableOpacity>
                </View>
              )}

              {(partnerPaymentSettings.bank_name ||
                partnerPaymentSettings.account_number) && (
                <View style={styles.paymentInfoCard}>
                  <Icon bgColor="#E8F0FF">
                    <BankIcon />
                  </Icon>
                  <View style={styles.paymentInfoContent}>
                    <Text style={styles.paymentInfoTitle}>銀行口座</Text>
                    {partnerPaymentSettings.bank_name && (
                      <Text style={styles.paymentInfoValue}>
                        銀行名: {partnerPaymentSettings.bank_name}
                      </Text>
                    )}
                    {partnerPaymentSettings.branch_name && (
                      <Text style={styles.paymentInfoValue}>
                        支店名: {partnerPaymentSettings.branch_name}
                      </Text>
                    )}
                    {partnerPaymentSettings.account_number && (
                      <Text style={styles.paymentInfoValue}>
                        口座番号: {partnerPaymentSettings.account_number}
                      </Text>
                    )}
                    {partnerPaymentSettings.account_holder_name && (
                      <Text style={styles.paymentInfoValue}>
                        口座名義: {partnerPaymentSettings.account_holder_name}
                      </Text>
                    )}
                  </View>
                  {partnerPaymentSettings.account_number && (
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() =>
                        handleCopy(
                          partnerPaymentSettings.account_number,
                          "口座番号"
                        )
                      }
                    >
                      <CopyIcon />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {!partnerPaymentSettings.paypay_id &&
                !partnerPaymentSettings.bank_name &&
                !partnerPaymentSettings.account_number && (
                  <View style={styles.emptyState}>
                    <Icon bgColor="#FFE5E5">
                      <MoneyIcon />
                    </Icon>
                    <Text style={styles.emptyText}>支払い情報が未設定です</Text>
                  </View>
                )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Icon bgColor="#FFE5E5">
                <MoneyIcon />
              </Icon>
              <Text style={styles.emptyText}>決済情報が登録されていません</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>支払状況</Text>
          <View style={styles.statusCard}>
            <Icon bgColor={`${getStatusColor(transactionStatus)}20`}>
              <StatusIcon status={transactionStatus} />
            </Icon>
            <View style={styles.statusContent}>
              <Text style={styles.statusText}>
                {getStatusText(transactionStatus)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.fixedButtonContainer}>
        {transactionStatus === "pending" && (
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={handleComplete}
          >
            <Text style={styles.buttonText}>送金完了</Text>
          </TouchableOpacity>
        )}

        {transactionStatus === "checking" && currentUserId === to_user && (
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={handleConfirmTransaction}
          >
            <Text style={styles.buttonText}>支払い確認</Text>
          </TouchableOpacity>
        )}

        {((transactionStatus === "checking" && currentUserId === from_user) ||
          transactionStatus === "completed") && (
          <TouchableOpacity
            style={styles.buttonDanger}
            onPress={handleCancelTransaction}
          >
            <Text style={styles.buttonText}>送金取り消し</Text>
          </TouchableOpacity>
        )}

        {transactionStatus === "completed" && currentUserId === to_user && (
          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={handleRevertToCheck}
          >
            <Text style={styles.buttonText}>確認取り消し</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6a7581",
    fontWeight: "500",
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: "#FFE5E5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dc3545",
  },
  errorText: {
    fontSize: 16,
    color: "#dc3545",
    textAlign: "center",
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
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#f1f2f4",
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#121416",
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 14,
    color: "#6a7581",
  },
  amountCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f2f4",
    alignItems: "center",
  },
  amountText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#3d547f",
  },
  paymentInfoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#f1f2f4",
  },
  paymentInfoContent: {
    flex: 1,
  },
  paymentInfoTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6a7581",
    marginBottom: 4,
  },
  paymentInfoValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#121416",
    marginBottom: 2,
  },
  copyButton: {
    backgroundColor: "#3d547f",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#f1f2f4",
  },
  statusContent: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#121416",
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
    shadowColor: "#dc3545",
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
    backgroundColor: "#ffc107",
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#ffc107",
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
