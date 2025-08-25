import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";

export default function App() {
  const [loading, setLoading] = useState(true); 
  const router = useRouter();

  useEffect(() => {
    const prepare = async () => {
      try {
  
        setTimeout(async () => {
        
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) {
            console.error("セッション確認エラー:", error);
            router.replace("/(auth)/login");
          } else if (session) {
            router.replace("/(tabs)/home/home");
          } else {
            router.replace("/(auth)/login");
          }
          setLoading(false); 
        }, 1000); 
      } catch (error) {
        console.error("セッション確認中のエラー:", error);
        setLoading(false);
      }
    };

    prepare();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN") {
          console.log("🔐 ログイン検知");
          router.replace("/(tabs)/home/home");
        }
        if (event === "SIGNED_OUT") {
          console.log("🚪 ログアウト検知");
          router.replace("/(auth)/login");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <ImageBackground
      source={require("../assets/images/start.png")} 
      style={styles.container}
    >
      {loading && (
        <ActivityIndicator size="large" color="white" style={styles.spinner} />
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  spinner: {
    position: "absolute", 
    bottom: 150,
  },
});
