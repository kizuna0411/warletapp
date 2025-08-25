import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { supabase } from "../../../lib/supabase";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { getUserIdFromAuthId } from "../../utils/utils";

const ChatScreen = () => {
  const route = useRoute();
  const { groupId } = route.params;
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [userName, setUserName] = useState("あなた");
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUserId = async () => {
      const id = await getUserIdFromAuthId();
      if (id) {
        setUserId(id);
      }
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchMessages();
      fetchUserName();
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const subscription = supabase
      .from("chat")
      .on("INSERT", (payload) => {
        setMessages((prevMessages) => [payload.new, ...prevMessages]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [groupId, userId]);

  const fetchUserName = async () => {
    const { data, error } = await supabase
      .from("users_info")
      .select("account_name")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setUserName(data.account_name);
    }
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("chat")
      .select("id, text, sender_id, sender_name, timestamp")
      .eq("group_id", groupId)
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("メッセージ取得エラー: ", error);
    } else {
      setMessages(data);
    }
  };

  const sendMessage = async () => {
    if (messageText.trim() === "" || !userId) {
      return;
    }

    const newMessage = {
      id: uuidv4(),
      group_id: groupId,
      sender_id: userId,
      sender_name: userName,
      text: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prevMessages) => [newMessage, ...prevMessages]);
    setMessageText("");

    try {
      const { error } = await supabase.from("messages").insert([newMessage]);
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("メッセージ送信エラー: ", error);
      alert("メッセージの送信に失敗しました。");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageContainer,
              item.sender_id === userId
                ? styles.myMessage
                : styles.otherMessage,
            ]}
          >
            <Text style={styles.sender}>{item.sender_name}</Text>
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
        inverted
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="メッセージを入力..."
          value={messageText}
          onChangeText={setMessageText}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>送信</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  messageContainer: {
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
    maxWidth: "80%",
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#007AFF",
    borderRadius: 10,
    padding: 10,
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
  },
  sender: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    color: "#333",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  input: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  sendButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
