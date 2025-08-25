import React, { useState, useCallback, useLayoutEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getUserIdFromAuthId, fetchGroupsById } from "../../utils/utils";
import {
  Icon,
  EventIcon,
  AddIcon,
  GroupIcon,
  JoinIcon,
  CreateIcon,
} from "../../../lib/icons";

const iconColors = [
  "#FFE5E5",
  "#E5F3FF",
  "#E5FFE5",
  "#FFF5E5",
  "#F0E5FF",
  "#FFE5F5",
];

export default function HomeScreen() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          style={styles.headerJoinButton}
          onPress={() => navigation.navigate("join-group-code")}
        >
          <JoinIcon />
        </Pressable>
      ),
    });
  }, [navigation]);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const Id = await getUserIdFromAuthId();
      if (!Id) {
        console.error("ユーザーIDの取得に失敗しました。");
        setLoading(false);
        return;
      }
      const fetchedGroups = await fetchGroupsById(Id);
      setGroups(fetchedGroups || []);
      console.log("取得したグループ一覧:", fetchedGroups);
    } catch (error) {
      console.error("グループ取得エラー@:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [fetchGroups])
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingSection}>
          <ActivityIndicator size="large" color="#3d547f" />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <GroupIcon />
          </View>
          <Text style={styles.noGroupsText}>まだグループがないよ！</Text>
          <Text style={styles.noGroupsSubText}>新しいグループを作ろう！</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) =>
            item.id?.toString() || Math.random().toString()
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.groupItem}
              onPress={() => {
                if (!item.id) {
                  console.error("グループIDが見つかりません");
                  return;
                }
                navigation.navigate("group", {
                  groupId: item.id,
                  groupName: item.name,
                });
              }}
              activeOpacity={0.7}
            >
              <Icon bgColor={iconColors[index % iconColors.length]}>
                <GroupIcon />
              </Icon>
              <View style={styles.groupContent}>
                <Text style={styles.groupText}>
                  {item.name || "名称未設定"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.groupList}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={() => navigation.navigate("create-group")}
          activeOpacity={0.8}
        >
          <CreateIcon />
          <Text style={styles.buttonText}>グループ作成</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerJoinButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  loadingSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
    color: "#6a7581",
    fontWeight: "500",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E5F3FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  noGroupsText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#3d547f",
    textAlign: "center",
    marginBottom: 8,
  },
  noGroupsSubText: {
    fontSize: 14,
    color: "#8B9DC3",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  groupList: {
    paddingBottom: 100,
  },
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    marginTop: 6,
    borderRadius: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: "#f1f2f4",

    marginRight: 10,
    marginLeft: 10,
  },
  groupContent: {
    flex: 1,
  },
  groupText: {
    color: "#121416",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: "#6a7581",
  },
  fixedButtonContainer: {
    position: "absolute",
    bottom: 34,
    left: 20,
    right: 20,
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
