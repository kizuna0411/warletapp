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
  Image,
  Alert,
  Pressable,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { supabase } from "../../../lib/supabase";
import { Swipeable } from "react-native-gesture-handler";
import {
  Icon,
  EventIcon,
  InviteIcon,
  CopyIcon,
  AddIcon,
  TrashIcon,
} from "../../../lib/icons";
import Svg, { Path } from "react-native-svg";

const GroupScreen = ({ route }) => {
  const navigation = useNavigation();
  const groupId = route?.params?.groupId;
  const groupName = route?.params?.groupName || "グループ名なし";

  const [group, setGroup] = useState({
    name: groupName,
    members: [],
    events: [],
    inviteCode: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchGroupDetails = useCallback(async () => {
    if (!groupId) {
      console.error("エラー: groupId が undefined です。");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: groupData, error: groupError } = await supabase
        .from("group_member")
        .select("user_id")
        .eq("group_id", groupId);
      if (groupError) {
        console.error("Error fetching groupData:", groupError);
        setLoading(false);
        return;
      }
      if (!groupData || groupData.length === 0) {
        console.log("No group members found.");
        setLoading(false);
        return;
      }
      const userIds = groupData.map((member) => member.user_id);
      if (!userIds || userIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: groupmemberData, error: memberError } = await supabase
        .from("users_info")
        .select("id, account_name, avatar_url")
        .in("id", userIds);
      if (memberError) {
        console.error("Error fetching groupmemberData:", memberError);
        setLoading(false);
      }
      const membersWithAvatars = groupmemberData.map((member) => ({
        id: member.id,
        name: member.account_name,
        url: member.avatar_url || "https://via.placeholder.com/150",
      }));

      const { data: eventsData, error: eventsError } = await supabase
        .from("event_info")
        .select("id, name, created_at")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });
      if (eventsError) {
        console.error("Error fetching events:", eventsError);
        setLoading(false);
        return;
      }
      const events =
        eventsData?.map((e) => ({
          id: e.id,
          name: e.name,
          created_at: new Date(e.created_at).toLocaleDateString("ja-JP"),
          raw_created_at: e.created_at,
        })) || [];

      const { data: groupInfoData, error: groupInfoError } = await supabase
        .from("group_info")
        .select("invite_code")
        .eq("id", groupId)
        .single();
      if (groupInfoError) {
        console.error("Error fetching groupInfo:", groupInfoError);
      }
      setGroup({
        name: groupName,
        members: membersWithAvatars,
        events,
        inviteCode: groupInfoData ? groupInfoData.invite_code : null,
      });
    } catch (error) {
      console.error("データ取得エラー:", error);
    } finally {
      setLoading(false);
    }
  }, [groupId, groupName]);

  useFocusEffect(
    useCallback(() => {
      fetchGroupDetails();
    }, [fetchGroupDetails])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: group.name,
      headerRight: () => (
        <Pressable
          style={styles.headerDeleteButton}
          onPress={handleDeleteGroup}
        >
          <Svg width="20" height="20" viewBox="0 0 256 256" fill="none">
            <Path
              d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"
              fill="#ff6b7a"
            />
          </Svg>
        </Pressable>
      ),
    });
  }, [navigation, group.name, handleDeleteGroup]);

  const handleCopyInviteCode = () => {
    if (group.inviteCode) {
      Clipboard.setStringAsync(group.inviteCode);
      Alert.alert("コピー完了", "招待コードをコピーしました。");
    } else {
      Alert.alert("エラー", "招待コードが取得できませんでした。");
    }
  };

  const handleDeleteEvent = (eventId) => {
    Alert.alert(
      "削除の確認",
      "このイベントを削除してもよろしいですか？",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("event_info")
                .delete()
                .eq("id", eventId);
              if (error) {
                console.error("Error deleting event:", error);
                Alert.alert("削除失敗", "イベントの削除に失敗しました。");
              } else {
                fetchGroupDetails();
                Alert.alert("削除完了", "イベントが削除されました。");
              }
            } catch (error) {
              console.error("イベント削除エラー:", error);
              Alert.alert("エラー", "イベントの削除中にエラーが発生しました。");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      "グループ削除の確認",
      "このグループを削除してもよろしいですか？（この操作は元に戻せません）",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("group_info")
                .delete()
                .eq("id", groupId);
              if (error) {
                console.error("グループ削除エラー:", error);
                Alert.alert("削除失敗", "グループの削除に失敗しました。");
              } else {
                Alert.alert("削除完了", "グループが削除されました。");
                navigation.goBack();
              }
            } catch (error) {
              console.error("削除中にエラー:", error);
              Alert.alert("エラー", "グループの削除中にエラーが発生しました。");
            }
          },
        },
      ]
    );
  };

  const renderRightActions = (eventId) => {
    return (
      <TouchableOpacity
        style={styles.swipeDeleteButton}
        onPress={() => handleDeleteEvent(eventId)}
      >
        <TrashIcon />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.inviteSection}>
        <Text style={styles.sectionTitle}>招待コード</Text>
        <View style={styles.inviteCard}>
          <Icon bgColor="#E5F3FF">
            <InviteIcon />
          </Icon>
          <View style={styles.inviteContent}>
            <Text style={styles.inviteCode}>
              {loading ? "読み込み中..." : group.inviteCode || "コードなし"}
            </Text>
          </View>
          {group.inviteCode && (
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyInviteCode}
            >
              <CopyIcon />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          メンバー ({group.members.length})
        </Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3d547f" />
          </View>
        ) : (
          <FlatList
            data={group.members}
            keyExtractor={(item) => item.id.toString()}
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.membersList}
            renderItem={({ item }) => (
              <View style={styles.memberItem}>
                <Image source={{ uri: item.url }} style={styles.memberAvatar} />
                <Text style={styles.memberName} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
            )}
          />
        )}
      </View>

      <View style={styles.eventsSection}>
        <Text style={styles.sectionTitle}>
          イベント ({group.events.length})
        </Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3d547f" />
          </View>
        ) : group.events.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <EventIcon />
            </View>
            <Text style={styles.emptyText}>まだイベントがありません</Text>
            <Text style={styles.emptySubText}>
              新しいイベントを作成してみましょう
            </Text>
          </View>
        ) : (
          <FlatList
            data={group.events}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.eventsList}
            renderItem={({ item, index }) => (
              <Swipeable renderRightActions={() => renderRightActions(item.id)}>
                <TouchableOpacity
                  style={styles.eventItem}
                  onPress={() =>
                    navigation.navigate("event", { eventId: item.id })
                  }
                  activeOpacity={0.7}
                >
                  <Icon bgColor={iconColors[index % iconColors.length]}>
                    <EventIcon />
                  </Icon>
                  <View style={styles.eventContent}>
                    <Text style={styles.eventName}>{item.name}</Text>
                    <Text style={styles.eventDate}>{item.created_at}</Text>
                  </View>
                </TouchableOpacity>
              </Swipeable>
            )}
          />
        )}
      </View>

      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={() =>
            navigation.navigate("create-event", { groupId: groupId })
          }
          activeOpacity={0.8}
        >
          <AddIcon />
          <Text style={styles.buttonText}>イベント作成</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const iconColors = [
  "#FFE5E5",
  "#E5F3FF",
  "#E5FFE5",
  "#FFF5E5",
  "#F0E5FF",
  "#FFE5F5",
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerDeleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(220, 53, 69, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(220, 53, 69, 0.4)",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    width: 40,
    height: 40,
    flexShrink: 0,
  },
  inviteSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#3d547f",
    marginBottom: 12,
  },
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#f1f2f4",
  },
  inviteContent: {
    flex: 1,
  },
  inviteCode: {
    fontSize: 16,
    fontWeight: "500",
    color: "#121416",
  },
  copyButton: {
    backgroundColor: "#3d547f",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  loadingContainer: {
    alignItems: "center",
    padding: 20,
  },
  membersList: {
    paddingVertical: 8,
  },
  memberItem: {
    alignItems: "center",
    marginRight: -0,
    width: 70,
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f1f2f4",
  },
  memberName: {
    fontSize: 12,
    color: "#6a7581",
    marginTop: 8,
    textAlign: "center",
  },
  eventsSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFE5E5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3d547f",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 16,
    color: "#8B9DC3",
    textAlign: "center",
    lineHeight: 24,
  },
  eventsList: {
    paddingBottom: 20,
  },
  eventItem: {
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
  eventContent: {
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
  swipeDeleteButton: {
    backgroundColor: "#dc3545",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "90%",
    marginBottom: 8,
    borderRadius: 12,
  },
});

export default GroupScreen;
