const router = require("express").Router();
const User = require("../models/User");
const authenticateToken = require("../middleware/authenticateToken");

router.get("/profile", authenticateToken, async (req, res) => {
  try {
    // console.log("ユーザー情報取得開始");
    const user = await User.findById(req.user.id); // req.user.id はトークンをもとに取得されたユーザーID
    if (!user) {
      console.log(`ユーザーが見つかりません: ${req.user.id}`);
      return res.status(404).json("ユーザーが見つかりません");
    }
    const response = {
      email: user.email,
      icon: user.icon, // 例: プロフィール画像のURL
      username: user.username,
      desc: user.desc,
    };
    res.status(200).json(response);
    console.log(`-----ユーザー情報取得成功-----`);
    // console.log(response);
    // console.log(`----------`);
  } catch (err) {
    console.log("-----ユーザー情報取得失敗-----\n", err);
    res.status(500).json("サーバーエラーが発生しました");
  }
});

router.get("/match/:userId", async (req, res) => {
  try {
    // console.log("ユーザー試合情報取得開始");
    const user = await User.findById(req.params.userId);
    if (!user) {
      console.log(`ユーザーが見つかりません: ${req.params.userId}`);
      return res.status(404).json("ユーザーが見つかりません");
    }
    const response = {
      icon: user.icon,
      username: user.username,
    };
    res.status(200).json(response);
    console.log(`-----ユーザー情報取得成功-----`);
    // console.log(response);
    // console.log(`----------`);
  } catch (err) {
    console.log("-----ユーザー試合情報失敗-----\n", err);
    res.status(500).json("サーバーエラーが発生しました");
  }
});

module.exports = router;
