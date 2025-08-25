import React, {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  Image,
  ScrollView,
  Platform,
  Modal,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { supabase } from "../../../lib/supabase";
import { getUserIdFromAuthId } from "../../utils/utils";
import Svg, { Path } from "react-native-svg";
import { Icon, EventIcon, CheckIcon } from "../../../lib/icons";

const CalendarIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 256 256" fill="none">
    <Path
      d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z"
      fill="#3d547f"
    />
  </Svg>
);

const CustomDatePicker = ({ visible, date, onDateSelect, onClose }) => {
  const [selectedYear, setSelectedYear] = useState(date.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(date.getMonth());
  const [selectedDay, setSelectedDay] = useState(date.getDate());

  const currentYear = new Date().getFullYear();

  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const months = [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
  ];

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleConfirm = () => {
    const newDate = new Date(selectedYear, selectedMonth, selectedDay);
    onDateSelect(newDate);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.datePickerContainer}>
          <View style={styles.datePickerHeader}>
            <Text style={styles.datePickerTitle}>日付を選択</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.datePickerContent}>
            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>年</Text>
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.pickerScroll}
              >
                {years.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.pickerItem,
                      selectedYear === year && styles.selectedPickerItem,
                    ]}
                    onPress={() => setSelectedYear(year)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedYear === year && styles.selectedPickerText,
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>月</Text>
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.pickerScroll}
              >
                {months.map((month, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.pickerItem,
                      selectedMonth === index && styles.selectedPickerItem,
                    ]}
                    onPress={() => setSelectedMonth(index)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedMonth === index && styles.selectedPickerText,
                      ]}
                    >
                      {month}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.pickerColumn}>
              <Text style={styles.pickerLabel}>日</Text>
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.pickerScroll}
              >
                {days.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.pickerItem,
                      selectedDay === day && styles.selectedPickerItem,
                    ]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedDay === day && styles.selectedPickerText,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.datePickerActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>決定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function CreateEventScreen({ route }) {
  const navigation = useNavigation();
  const groupId = route?.params?.groupId;

  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const fetchGroupMembers = useCallback(async () => {
    if (!groupId) {
      return;
    }

    setLoading(true);
    try {
      const { data: groupMemberData, error: memberError } = await supabase
        .from("group_member")
        .select("user_id")
        .eq("group_id", groupId);

      if (memberError) {
        console.error("Error fetching group members:", memberError);
        return;
      }

      const userIds = groupMemberData.map((member) => member.user_id);

      const { data: userData, error: userError } = await supabase
        .from("users_info")
        .select("id, account_name, avatar_url")
        .in("id", userIds);

      if (userError) {
        console.error("Error fetching user data:", userError);
        return;
      }

      const membersWithAvatars = userData.map((member) => ({
        id: member.id,
        name: member.account_name,
        avatar: member.avatar_url || "https://via.placeholder.com/150",
      }));

      setMembers(membersWithAvatars);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      fetchGroupMembers();
    }, [fetchGroupMembers])
  );

  const toggleMemberSelection = (memberId) => {
    const newSelectedMembers = new Set(selectedMembers);
    if (newSelectedMembers.has(memberId)) {
      newSelectedMembers.delete(memberId);
    } else {
      newSelectedMembers.add(memberId);
    }
    setSelectedMembers(newSelectedMembers);
  };

  const formatDate = (date) => {
    return date.toISOString().split("T")[0];
  };

  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  const onDateChange = (selectedDate) => {
    setEventDate(selectedDate);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const closeDatePicker = () => {
    setShowDatePicker(false);
  };

  const handleCreateEvent = async () => {
    if (!eventName.trim()) {
      Alert.alert("エラー", "イベント名を入力してください");
      return;
    }

    if (selectedMembers.size === 0) {
      Alert.alert("エラー", "参加メンバーを選択してください");
      return;
    }

    try {
      const currentUserId = await getUserIdFromAuthId();

      const { data: eventData, error: eventError } = await supabase
        .from("event_info")
        .insert([
          {
            name: eventName,
            date: formatDate(eventDate),
            group_id: groupId,
            status: "pending",
          },
        ])
        .select("id")
        .single();

      if (eventError) {
        console.error("Error creating event:", eventError);
        Alert.alert("エラー", "イベント作成に失敗しました");
        return;
      }

      const memberInserts = Array.from(selectedMembers).map((memberId) => ({
        event_id: eventData.id,
        user_id: memberId,
      }));

      const { error: memberError } = await supabase
        .from("event_member")
        .insert(memberInserts);

      if (memberError) {
        console.error("Error adding members:", memberError);
        Alert.alert("エラー", "メンバー追加に失敗しました");
        return;
      }

      Alert.alert("成功", "イベントが作成されました", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Error creating event:", error);
      Alert.alert("エラー", "イベント作成中にエラーが発生しました");
    }
  };

  const renderMemberItem = ({ item }) => {
    const isSelected = selectedMembers.has(item.id);

    return (
      <TouchableOpacity
        style={styles.memberItem}
        onPress={() => toggleMemberSelection(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.memberAvatarContainer}>
          {isSelected ? (
            <View style={styles.selectedAvatar}>
              <CheckIcon />
            </View>
          ) : (
            <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
          )}
        </View>
        <Text
          style={[styles.memberName, isSelected && styles.selectedMemberName]}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>イベント情報</Text>

          <View style={styles.inputCard}>
            <Icon bgColor="#E5F3FF">
              <EventIcon />
            </Icon>
            <View style={styles.inputContent}>
              <Text style={styles.inputLabel}>イベント名</Text>
              <TextInput
                style={styles.input}
                placeholder="例: 飲み会、旅行"
                value={eventName}
                onChangeText={setEventName}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.inputCard} onPress={showDatepicker}>
            <Icon bgColor="#FFE5F5">
              <CalendarIcon />
            </Icon>
            <View style={styles.inputContent}>
              <Text style={styles.inputLabel}>イベント日付</Text>
              <Text style={styles.dateText}>
                {formatDateForDisplay(eventDate)}
              </Text>
              <Text style={styles.inputHint}>タップして日付を選択</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            参加メンバー ({selectedMembers.size}人選択中)
          </Text>
          <Text style={styles.sectionSubText}>
            タップしてメンバーを選択してください
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>メンバーを読み込み中...</Text>
            </View>
          ) : (
            <FlatList
              data={members}
              keyExtractor={(item) => item.id.toString()}
              numColumns={4}
              scrollEnabled={false}
              contentContainerStyle={styles.membersList}
              renderItem={renderMemberItem}
            />
          )}
        </View>
      </ScrollView>

      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={handleCreateEvent}
        >
          <Text style={styles.buttonText}>イベントを作成</Text>
        </TouchableOpacity>
      </View>

      <CustomDatePicker
        visible={showDatePicker}
        date={eventDate}
        onDateSelect={onDateChange}
        onClose={closeDatePicker}
      />
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
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#3d547f",
    marginBottom: 4,
    marginTop: 16,
  },
  sectionSubText: {
    fontSize: 14,
    color: "#6a7581",
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
    marginBottom: 10,
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
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#6a7581",
  },
  membersList: {
    gap: 16,
  },
  memberItem: {
    alignItems: "center",
    flex: 1,
    maxWidth: "25%",
  },
  memberAvatarContainer: {
    marginBottom: 8,
  },
  memberAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f1f2f4",
  },
  selectedAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#3d547f",
    alignItems: "center",
    justifyContent: "center",
  },
  memberName: {
    fontSize: 12,
    color: "#6a7581",
    textAlign: "center",
    numberOfLines: 1,
  },
  selectedMemberName: {
    color: "#3d547f",
    fontWeight: "600",
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
  dateText: {
    fontSize: 16,
    color: "#121416",
    paddingVertical: 4,
  },
  inputHint: {
    fontSize: 12,
    color: "#8B9DC3",
    marginTop: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  datePickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "90%",
    maxHeight: "70%",
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f2f4",
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#3d547f",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f1f2f4",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 18,
    color: "#6a7581",
    fontWeight: "bold",
  },
  datePickerContent: {
    flexDirection: "row",
    padding: 20,
    height: 300,
  },
  pickerColumn: {
    flex: 1,
    alignItems: "center",
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6a7581",
    marginBottom: 10,
  },
  pickerScroll: {
    flex: 1,
    width: "100%",
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
    alignItems: "center",
  },
  selectedPickerItem: {
    backgroundColor: "#3d547f",
  },
  pickerItemText: {
    fontSize: 16,
    color: "#121416",
  },
  selectedPickerText: {
    color: "#fff",
    fontWeight: "600",
  },
  datePickerActions: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f2f4",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#f1f2f4",
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#6a7581",
    fontWeight: "500",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#3d547f",
    borderRadius: 12,
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
});
