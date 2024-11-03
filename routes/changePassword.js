const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");

// Nodemailerの設定
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE, // 使用するメールサービス
  auth: {
    user: process.env.EMAIL_ADDRESS, // 送信用のメールアドレス
    pass: process.env.EMAIL_PASSWORD, // アプリパスワード推奨
  },
});

router.post(
  "/",
  [
    // 入力バリデーション
    body("email")
      .isEmail()
      .withMessage("有効なメールアドレスを入力してください\n")
      .matches(/@shizuoka\.ac\.jp$/)
      .withMessage("静岡大学のメールアドレスを入力してください\n")
      .isLength({ max: 100 })
      .withMessage("メールアドレスは100文字以内で入力してください\n"),
  ],
  async (req, res) => {
    // バリデーションエラーのチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("-----入力バリデーションエラー-----");
      return res.status(400).json(errors.array().map((element) => element.msg));
    }
    try {
      // メールアドレスの存在チェック
      const existingUser = await User.findOne({ email: req.body.email });
      if (!existingUser) {
        console.log("-----登録されていないメアド-----\n");
        return res
          .status(400)
          .json(
            "このメールアドレスは登録されていません。新しくアカウントを作成してください"
          );
      }
      //メアドを送信したのにまたポストされたら
      if (existingUser.verificationToken) {
        console.log("-----何度もメールを送っている-----");
        return res
          .status(400)
          .json(
            "メールを送信しました。10分以内にメールのリンクをクリックしてパスワードを変更してください"
          );
      }

      // 確認トークンを生成
      const verificationToken = crypto.randomBytes(32).toString("hex");

      // UserスキーマにverificationTokenを追加
      existingUser.verificationToken = verificationToken;
      await existingUser.save();

      // 10分たったらverificationTokenを削除
      setTimeout(async () => {
        const userToDelete = await User.findOne({
          verificationToken: verificationToken,
        });
        if (userToDelete) {
          userToDelete.verificationToken = undefined; // トークンを無効化
          await userToDelete.save();
          console.log(
            `ユーザー ${userToDelete.email} のパスワード変更を取り消しました`
          );
        }
      }, 10 * 60 * 1000); // 10分後に実行

      // メール送信設定
      const verificationLink = `${process.env.FRONTEND_URL}/auth/changepassword/${verificationToken}`;
      const mailOptions = {
        from: `"Tokai Mahjong League" <${process.env.EMAIL_ADDRESS}>`,
        to: req.body.email,
        subject: "パスワード変更メール",
        text: `10分以内に下記のリンクをクリックしてパスワードを変更してください: ${verificationLink}`,
      };

      // メール送信
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log("メールの送信失敗: ", error);
          return res.status(500).json("メールの送信に失敗しました");
        } else {
          console.log("メール送信成功: " + info.response);
          return res
            .status(200)
            .json(
              "確認メールを送信しました。メール内のリンクから登録を完了してください。"
            );
        }
      });
    } catch (err) {
      console.log(err);
      return res
        .status(500)
        .json("予期せぬエラーが発生し、メールが送れませんでした");
    }
  }
);

// アカウント確認用エンドポイント
router.put("/verify/:token", async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });
    if (!user) {
      return res.status(400).json("無効なトークンです");
    }

    // 新しいパスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    user.password = hashedPassword;
    user.verificationToken = undefined; // トークンを無効化
    await user.save();

    return res.status(200).json("パスワードの変更が完了しました");
  } catch (err) {
    console.log("-----アカウント確認失敗-----\n", err);
    return res.status(500).json("予期せぬエラーが発生しました");
  }
});

module.exports = router;
