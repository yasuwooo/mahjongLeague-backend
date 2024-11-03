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

// create new account with validation and password hashing
router.post(
  "/",
  [
    // 入力バリデーション
    body("username")
      .isLength({ min: 3, max: 15 })
      .withMessage("ユーザー名は3～15文字で入力してください\n"),
    body("email")
      .isEmail()
      .withMessage("有効なメールアドレスを入力してください\n")
      .matches(/@shizuoka\.ac\.jp$/)
      .withMessage("静岡大学のメールアドレスを入力してください\n")
      .isLength({ max: 100 })
      .withMessage("メールアドレスは100文字以内で入力してください\n"),
    body("password")
      .isLength({ min: 6, max: 100 })
      .withMessage("パスワードは6～100文字で入力してください\n"),
  ],
  async (req, res) => {
    // バリデーションエラーのチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("-----バリデーションエラー-----\n");
      return res.status(400).json(errors.array().map((element) => element.msg));
    }
    try {
      //ユーザー名の重複チェック
      const valideUsername = await User.findOne({
        username: req.body.username,
      });
      if (valideUsername) {
        console.log("-----ユーザー名重複-----");
        return res
          .status(400)
          .json("このユーザーネームはすでに使用されています");
      }

      // メールアドレスの重複チェック
      const existingUser = await User.findOne({ email: req.body.email });
      if (existingUser) {
        if (existingUser.verificationToken) {
          console.log("-----メールアドレス重複-----");
          return res
            .status(400)
            .json(
              "メールを送信しました。10分以内にメールのリンクをクリックしてアカウント登録を完了してください"
            );
        }
        return res.status(400).json("このメールアドレスは既に登録されています");
      }

      // パスワードをハッシュ化
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);

      // 確認トークンを生成
      const verificationToken = crypto.randomBytes(32).toString("hex");

      // 新しいユーザー作成
      const newUser = new User({
        username: req.body.username,
        email: req.body.email,
        password: hashedPassword,
        verificationToken: verificationToken,
        isVerified: false,
      });

      // ユーザーをデータベースに保存
      const user = await newUser.save();

      // 10分後に仮ユーザーの削除をスケジュール
      setTimeout(async () => {
        const userToDelete = await User.findOne({
          verificationToken: verificationToken,
          isVerified: false,
        });
        if (userToDelete) {
          await User.deleteOne({ _id: userToDelete._id });
          console.log(`未確認のユーザー ${userToDelete.email} を削除しました`);
        }
      }, 10 * 60 * 1000); // 10分後に実行

      // メール送信設定
      const verificationLink = `${process.env.FRONTEND_URL}/auth/register/${verificationToken}`;
      const mailOptions = {
        from: `"Tokai Mahjong League" <${process.env.EMAIL_ADDRESS}>`,
        to: user.email,
        subject: "アカウント確認メール",
        text: `以下のリンクをクリックしてアカウント登録を完了してください: ${verificationLink}`,
      };

      // メール送信
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log("-----メール送信失敗-----\n", error);
          return res.status(500).json("確認メールの送信に失敗しました");
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
      console.log("-----アカウント仮登録失敗-----", err);
      return res.status(500).json("予期せぬエラーが発生しました");
    }
  }
);

// アカウント確認用エンドポイント
router.get("/verify/:token", async (req, res) => {
  try {
    console.log(`リクエストされたトークン: ${req.params.token}`);

    const user = await User.findOne({ verificationToken: req.params.token });
    if (!user) {
      return res.status(400).json("無効なトークンです");
    }

    user.isVerified = true;
    user.verificationToken = undefined; // トークンを無効化
    await user.save();

    console.log(`アカウント作成完了: ${user.email}`);
    return res.status(200).json("アカウントの確認が完了しました！");
  } catch (err) {
    console.log("-----アカウント登録失敗-----\n", err);
    return res.status(500).json("予期せぬエラーが発生しました");
  }
});

module.exports = router;
