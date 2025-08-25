import React, { useState, useEffect, useLayoutEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { supabase } from "../../../lib/supabase";
import { getUserIdFromAuthId } from "../../utils/utils";
import { useNavigation } from "expo-router";
import { Icon, PaymentIcon, BankIcon, CashlessIcon } from "../../../lib/icons";

const PaymentSetting = () => {
  const navigation = useNavigation();
  const [paypayID, setPaypayID] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentSetting = async () => {
      try {
        const userId = await getUserIdFromAuthId();
        const { data, error } = await supabase
          .from("payment_setting")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (error && error.code !== "PGRST116") {
          Alert.alert("エラー", error.message);
        } else if (data) {
          setPaypayID(data.paypay_id || "");
          setBankName(data.bank_name || "");
          setBranchName(data.branch_name || "");
          setAccountNumber(data.account_number || "");
          setAccountHolderName(data.account_holder_name || "");
        }
      } catch (error) {
        Alert.alert("エラー", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentSetting();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    const userId = await getUserIdFromAuthId();

    const { error } = await supabase.from("payment_setting").upsert(
      {
        user_id: userId,
        paypay_id: paypayID || null,
        bank_name: bankName || null,
        branch_name: branchName || null,
        account_number: accountNumber || null,
        account_holder_name: accountHolderName || null,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      Alert.alert("保存エラー", error.message);
      console.log(error.message);
    } else {
      Alert.alert("保存完了", "支払い情報を保存しました");
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3d547f" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PayPay設定</Text>
          <View style={styles.inputCard}>
            <Icon bgColor="#E5F3FF">
              <CashlessIcon />
            </Icon>
            <View style={styles.inputContent}>
              <Text style={styles.inputLabel}>PayPay ID</Text>
              <TextInput
                style={styles.input}
                placeholder="PayPay IDを入力"
                value={paypayID}
                onChangeText={setPaypayID}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>銀行口座設定</Text>
          <View style={styles.inputCard}>
            <Icon bgColor="#E5FFE5">
              <BankIcon />
            </Icon>
            <View style={styles.inputContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>銀行名</Text>
                <TextInput
                  style={styles.input}
                  placeholder="銀行名を入力"
                  value={bankName}
                  onChangeText={setBankName}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>支店名</Text>
                <TextInput
                  style={styles.input}
                  placeholder="支店名を入力"
                  value={branchName}
                  onChangeText={setBranchName}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>口座番号</Text>
                <TextInput
                  style={styles.input}
                  placeholder="口座番号を入力"
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>口座名義</Text>
                <TextInput
                  style={styles.input}
                  placeholder="口座名義を入力"
                  value={accountHolderName}
                  onChangeText={setAccountHolderName}
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity style={styles.buttonPrimary} onPress={handleSave}>
          <Text style={styles.buttonText}>保存</Text>
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
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6a7581",
  },
  input: {
    fontSize: 16,
    color: "#121416",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
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
  },
});

export default PaymentSetting;
