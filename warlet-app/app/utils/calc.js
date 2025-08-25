import { supabase } from "../../lib/supabase";

export const calculateSplit = async (event_id) => {
  try {
    console.log("割り勘開始", "event_id:", event_id);

    // 入力値検証
    if (!event_id) {
      console.error("calculateSplit: event_id が指定されていません");
      throw new Error("Event ID is required");
    }

    if (typeof event_id !== "number" && typeof event_id !== "string") {
      console.error(
        "calculateSplit: 不正な event_id 形式:",
        typeof event_id,
        event_id
      );
      throw new Error("Invalid event ID format");
    }

    // Supabase接続確認
    if (!supabase) {
      console.error("calculateSplit: Supabase client is not available");
      throw new Error("Database connection is not available");
    }

    // 1. イベント参加者の取得
    const { data: members, error: memberError } = await supabase
      .from("event_member")
      .select("user_id")
      .eq("event_id", event_id);

    if (memberError) {
      console.error("calculateSplit: メンバー取得エラー:", memberError);
      console.error("Member error details:", {
        message: memberError.message,
        code: memberError.code,
        hint: memberError.hint,
      });
      throw new Error(`Failed to fetch event members: ${memberError.message}`);
    }

    if (!members || members.length === 0) {
      console.warn("calculateSplit: 該当イベントのメンバーが存在しません");
      throw new Error("No members found for this event");
    }

    // メンバーデータの整合性確認
    const validMembers = members.filter(
      (member) =>
        member &&
        member.user_id &&
        (typeof member.user_id === "number" ||
          typeof member.user_id === "string")
    );

    if (validMembers.length !== members.length) {
      console.warn(
        "calculateSplit: 不正なメンバーデータが含まれています",
        members
      );
    }

    console.log(
      "取得した参加者数:",
      validMembers.length,
      "内容:",
      validMembers
    );

    // 各参加者の支払い額を初期化（未払いは 0 とする）
    const paymentMap = {};
    validMembers.forEach((member) => {
      paymentMap[member.user_id] = 0;
    });
    console.log("初期化後の paymentMap:", paymentMap);

    // 2. 支払い情報の取得
    const { data: payments, error: paymentError } = await supabase
      .from("payment_info")
      .select("payer_id, amount, selected_members")
      .eq("event_id", event_id);

    if (paymentError) {
      console.error("calculateSplit: 支払い情報取得エラー:", paymentError);
      console.error("Payment error details:", {
        message: paymentError.message,
        code: paymentError.code,
        hint: paymentError.hint,
      });
      throw new Error(`Failed to fetch payment info: ${paymentError.message}`);
    }

    console.log("取得した支払い情報:", payments);

    // 支払い情報の整合性確認と集計
    if (payments && payments.length > 0) {
      payments.forEach((payment) => {
        if (!payment) {
          console.warn("calculateSplit: 不正な支払い情報をスキップ:", payment);
          return;
        }

        if (!payment.payer_id) {
          console.warn("calculateSplit: payer_id が不正:", payment);
          return;
        }

        if (typeof payment.amount !== "number" || payment.amount < 0) {
          console.warn("calculateSplit: 金額が不正:", payment.amount);
          return;
        }

        // 選択されたメンバーがある場合はそれを使用、なければ全員
        console.log("payment.selected_members の値:", payment.selected_members);
        console.log(
          "payment.selected_members の型:",
          typeof payment.selected_members
        );
        console.log(
          "payment.selected_members.length:",
          payment.selected_members?.length
        );

        const selectedMembers =
          payment.selected_members && payment.selected_members.length > 0
            ? payment.selected_members
            : validMembers.map((m) => m.user_id);

        console.log("使用される selectedMembers:", selectedMembers);
        console.log("selectedMembers.length:", selectedMembers.length);

        // 支払った人の記録
        if (paymentMap.hasOwnProperty(payment.payer_id)) {
          paymentMap[payment.payer_id] += payment.amount;
        } else {
          console.warn(
            "calculateSplit: 参加者にいない payer_id:",
            payment.payer_id
          );
        }

        // 選択されたメンバーに対して負債を分散
        const sharePerPerson = payment.amount / selectedMembers.length;
        console.log(
          `負債分散: 金額 ${payment.amount} を ${selectedMembers.length} 人で分割 = 1人あたり ${sharePerPerson} 円`
        );

        selectedMembers.forEach((memberId) => {
          if (paymentMap.hasOwnProperty(memberId)) {
            console.log(
              `${memberId} に ${sharePerPerson} 円の負債を追加 (現在: ${paymentMap[memberId]})`
            );
            paymentMap[memberId] -= sharePerPerson;
            console.log(`${memberId} の更新後残高: ${paymentMap[memberId]}`);
          } else {
            console.warn(
              `selectedMember ${memberId} は参加者リストにありません`
            );
          }
        });
      });
    }

    console.log("支払い情報集計後の paymentMap:", paymentMap);

    // 3. 各ユーザーの差額を計算（支払った額 - 負担額）
    const balances = [];
    for (const user_id in paymentMap) {
      const userBalance = paymentMap[user_id];
      balances.push({ user_id, balance: userBalance });
    }
    console.log("各ユーザーの差額（balance）:", balances);

    // 4.5 ユーザー名を取得して結果を表示
    const { data: userNames, error: userNameError } = await supabase
      .from("users_info")
      .select("id, account_name")
      .in("id", Object.keys(paymentMap));
    if (userNameError) {
      console.error("ユーザー名取得エラー:", userNameError);
    }
    const nameMap = {};
    if (userNames) {
      userNames.forEach((u) => {
        nameMap[u.id] = u.account_name;
      });
    }
    const finalBalances = balances.map((b) => ({
      user_id: b.user_id,
      name: nameMap[b.user_id] || b.user_id,
      balance: b.balance,
    }));
    console.log("最終結果（名前付き）:");
    finalBalances.forEach((b) => {
      if (b.balance > 0) {
        console.log(`${b.name}　+${b.balance} (受取り)`);
      } else if (b.balance < 0) {
        console.log(`${b.name}　${b.balance} (支払い)`);
      } else {
        console.log(`${b.name}　±0`);
      }
    });

    // 5. クレジター（多く支払った側）とデバイター（不足側）に分ける
    const creditors = balances
      .filter((item) => item.balance > 0)
      .sort((a, b) => b.balance - a.balance);
    const debtors = balances
      .filter((item) => item.balance < 0)
      .sort((a, b) => a.balance - b.balance);
    console.log("creditors:", creditors);
    console.log("debtors:", debtors);

    const transactions = [];
    let debtorIndex = 0;
    let creditorIndex = 0;

    // 6. 差額を相殺する送金情報を生成
    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];
      const amountToPay = Math.min(creditor.balance, -debtor.balance);

      transactions.push({
        event_id,
        from_user: debtor.user_id,
        to_user: creditor.user_id,
        amount: amountToPay,
      });
      console.log(
        `処理中: ${debtor.user_id} から ${creditor.user_id} へ ${amountToPay} 円`
      );

      debtor.balance += amountToPay;
      creditor.balance -= amountToPay;

      if (Math.abs(debtor.balance) < 1e-6) {
        debtorIndex++;
      }
      if (Math.abs(creditor.balance) < 1e-6) {
        creditorIndex++;
      }
    }
    console.log("生成された transactions:", transactions);

    // 7. transaction_info テーブルへ送金情報をアップサートで登録
    for (const tx of transactions) {
      if (tx.from_user === tx.to_user) {
        console.log("自分から自分への送金はスキップ:", tx);
        continue;
      }
      const { data: txData, error } = await supabase
        .from("transaction_info")
        .upsert(tx, { onConflict: ["event_id", "from_user", "to_user"] });
      console.log("トランザクションアップサート結果:", txData, error);
      if (error) {
        console.error("calculateSplit: 送金情報アップサートエラー:", error);
      }
    }

    console.log("割り勘計算完了");
    // 結果として、transactions と名前付きの最終差額（finalBalances）を返す
    return { transactions, finalBalances };
  } catch (err) {
    console.error("calculateSplit エラー:", err);
    throw err;
  }
};
