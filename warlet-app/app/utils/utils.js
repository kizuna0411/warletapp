import { supabase } from "../../lib/supabase";
import { useEffect, useCallback } from "react";

//AuthIdからUserIdを取得(戻り値:UserId)
export const getUserIdFromAuthId = async () => {
  try {
    // Supabase接続確認
    if (!supabase) {
      console.error("Supabase client is not available");
      return null;
    }

    // 認証ユーザーの情報を取得
    const { data: authUser, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error("ユーザー情報取得エラー:", userError);
      console.error("Error details:", {
        message: userError.message,
        status: userError.status,
        name: userError.name,
      });

      // 認証エラーの場合は具体的なメッセージを表示
      if (userError.status === 401) {
        alert("セッションが無効です。再ログインしてください。");
      } else {
        alert("ログインが必要です。");
      }
      return null;
    }

    if (!authUser?.user?.id) {
      console.error("認証ユーザー情報が不正です:", authUser);
      alert("ユーザー認証に問題があります。再ログインしてください。");
      return null;
    }

    const authId = authUser.user.id;
    console.log("取得した Auth ID:", authId);

    // 入力値検証
    if (typeof authId !== "string" || authId.length === 0) {
      console.error("Invalid auth ID:", authId);
      return null;
    }

    // `users_info` から `auth_id` に対応する `id` を取得
    const { data: userInfo, error: error1 } = await supabase
      .from("users_info")
      .select("id")
      .eq("auth_id", authId)
      .single();

    if (error1) {
      console.error("ユーザー情報取得エラー auth_id:", error1);
      console.error("Error details:", {
        message: error1.message,
        code: error1.code,
        hint: error1.hint,
      });

      // データベースエラーの詳細な分析
      if (error1.code === "PGRST116") {
        alert("ユーザー情報が見つかりません。管理者にお問い合わせください。");
      } else if (error1.code === "PGRST301") {
        alert(
          "複数のユーザー情報が見つかりました。管理者にお問い合わせください。"
        );
      } else {
        alert("ユーザー情報の取得に失敗しました。");
      }
      return null;
    }

    if (!userInfo?.id) {
      console.error("ユーザー情報のIDが不正です:", userInfo);
      alert("ユーザー情報に問題があります。");
      return null;
    }

    console.log("取得した Owner ID:", userInfo.id);
    return userInfo.id;
  } catch (error) {
    console.error("getUserIdFromAuthId 予期しないエラー:", error);
    console.error("Error stack:", error.stack);

    // ネットワークエラーの検出
    if (error.message && error.message.includes("fetch")) {
      alert("ネットワーク接続に問題があります。接続を確認してください。");
    } else {
      alert("ユーザー情報の取得中にエラーが発生しました。");
    }
    return null;
  }
};

//AuthIdからGroupIdを取得(戻り値:GroupId)
export const getGroupIdFromAuthId = async () => {
  try {
    //idからgroupIdを取得
    const ownerId = await getUserIdFromAuthId();

    const { data: groupData, error: error2 } = await supabase
      .from("group_info")
      .select("id")
      .eq("owner_id", ownerId);

    if (error2) {
      console.error("グループ情報取得エラー@utils:", error2);
      return null;
    }

    console.log("取得したグループ:", groupData.id);
    return groupData.id;
  } catch (error) {
    console.error("ユーザー情報取得エラー:", error);
    return null;
  }
};

export const fetchGroupsById = async (Id) => {
  try {
    const { data: data1, error: error1 } = await supabase
      .from("group_member")
      .select("group_id")
      .eq("user_id", Id);

    if (error1 || !data1 || data1.length === 0) {
      console.error("グループメンバー情報取得エラー:", error1);
      return [];
    }

    const groupIds = data1.map((item) => item.group_id);

    const { data, error } = await supabase
      .from("group_info")
      .select("id, name, created_at")
      .in("id", groupIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("グループ情報取得エラー:", error);
      return [];
    }

    console.log("取得したグループ:", data);
    return data; // 配列でグループ情報を返す
  } catch (err) {
    console.error("エラー:", err);
    return [];
  }
};
