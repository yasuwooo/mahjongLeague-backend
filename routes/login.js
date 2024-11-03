const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

router.post("/", async (req, res) => {
  try {
    console.log(`${req.body.email}: ログイン申請`);
    const AuthenticationFailureMsg =
      "認証に失敗しました。メールアドレスとパスワードをもう一度確認してください";

    // メールアドレスでユーザーを検索
    const user = await User.findOne({ email: req.body.email });

    // ユーザーが存在しない場合
    if (!user) {
      console.log(`${req.body.email}: で登録されたアカウントはないです`);
      return res.status(400).json(AuthenticationFailureMsg);
    }

    // パスワードの比較
    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!validPassword) {
      console.log(
        `${req.body.email}のパスワード: ${req.body.password} が一致しません`
      );
      return res.status(400).json(AuthenticationFailureMsg);
    }

    // ログイン成功：JWTトークンを生成
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRETKEY,
      { expiresIn: "1h" }
    );

    // JWTトークンをクッキーに設定
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    console.log(`${req.body.email}: ログイン申請受理`);
    res.status(200).json("ログインに成功しました");
  } catch (err) {
    console.log("ログイン失敗: ", err);
    return res
      .status(500)
      .json(
        "サーバーに問題が生じています。\nお手数ですが時間をおいてもう一度お試しください"
      );
  }
});

// auth_tokenが正しいか確かめるエンドポイント
router.get("/check-auth", async (req, res) => {
  const token = await req.cookies.auth_token;
  console.log(`/check-auth エンドポイント auth-token検証開始`);

  if (!token) {
    console.log(`/check-auth エンドポイント auth-token not found`);
    return res.status(401).json("認証トークンが見つかりません");
  }

  //トークンを検証
  jwt.verify(token, process.env.JWT_SECRETKEY, (err, user) => {
    if (err) {
      console.log(`/check-auth エンドポイント auth-token不一致`);
      return res.status(403).json("無効な認証トークンです");
    }
    //トークンが有効な場合、ユーザーが認証されていると判断する
    console.log(`/check-auth エンドポイント auth-token 認証確認`);
    res.status(200).json("認証トークンの一致を確認しました");
  });
});

module.exports = router;
