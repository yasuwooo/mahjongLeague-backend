const router = require("express").Router();
const User = require("../models/User");
const nodemailer = require("nodemailer");
const { body, validationResult } = require("express-validator");
const authenticateToken = require("../middleware/authenticateToken");

// Nodemailerの設定
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE, // 使用するメールサービス
  auth: {
    user: process.env.EMAIL_ADDRESS, // 送信用のメールアドレス
    pass: process.env.EMAIL_PASSWORD, // アプリパスワード推奨
  },
});

router.put(
  "/",
  authenticateToken,
  [
    // 入力バリデーション
    body("desc")
      .isLength({ max: 100 })
      .withMessage("説明欄は150字以内で入力してください\n"),
  ],
  async (req, res) => {
    // バリデーションエラーのチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(errors.array().map((element) => element.msg));
    }
    try {
      // ここでUser.descを変更
      const user = await User.findById(req.user.id);
      if (!user) {
        return res
          .status(400)
          .json("無効なトークンです/nログイン状態を確認してください");
      }

      user.desc = req.body.desc;
      await user.save();

      // メール送信設定
      const mailOptions = {
        from: `"Tokai Mahjong League" <${process.env.EMAIL_ADDRESS}>`,
        to: req.user.email,
        subject: "アカウント情報が変更されました",
        text: `アカウント情報を変更しましたか？変更していない場合は何者かに不正ログインされています`,
      };

      // メール送信
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
          return res.status(500).json("アカウント情報を変更に失敗しました");
        } else {
          console.log("メール送信成功: " + info.response);
          return res.status(200).json("アカウント情報変更に成功しました");
        }
      });
    } catch (err) {
      console.log("-----アカウント情報変更失敗-----", err);
      return res.status(500).json("予期せぬエラーが発生しました");
    }
  }
);

module.exports = router;
