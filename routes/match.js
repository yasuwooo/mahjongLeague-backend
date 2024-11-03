const authenticateToken = require("../middleware/authenticateToken");
const Match = require("../models/Match");
const User = require("../models/User");

const router = require("express").Router();

// 試合登録をする
router.post("/register", authenticateToken, async (req, res) => {
  try {
    // console.log("試合情報登録開始");
    // console.log("-----取得BODY-----");
    // console.log(req.body);
    // console.log("-----取得BODY-----");

    // ユーザー情報の取得
    const usernames = [
      req.body.user1.username,
      req.body.user2.username,
      req.body.user3.username,
    ];
    if (req.body.playNumber === 4) {
      usernames.push(req.body.user4.username);
    }
    // console.log("usernames: ", usernames);

    // バリデーション
    // ユーザー名が全てユニークかチェック
    const uniqueUsernames = new Set(usernames);
    if (uniqueUsernames.size !== usernames.length) {
      // console.log("uniqueUsernames.size: ", uniqueUsernames.size);
      // console.log("usernames.length: ", usernames.length);
      console.log("ユーザー名がユニークじゃなかった");
      return res.status(400).json("ユーザー名が重複・空白の欄があります");
    }

    // ユーザー名が存在しているかチェック
    const users = await Promise.all(
      usernames.map((username) => User.findOne({ username }))
    );
    if (users.some((user) => !user)) {
      console.log("存在しないユーザー名が含まれています");
      return res.status(400).json(`存在しないユーザー名が含まれています`);
    }

    // ポイントが有効かどうかをチェック
    const points = [
      req.body.user1.point,
      req.body.user2.point,
      req.body.user3.point,
    ];
    if (req.body.playNumber === 4) {
      points.push(req.body.user4.point);
    }
    if (points.some((point) => typeof point !== "number")) {
      console.log("ポイント無効");
      return res.status(400).json("無効なポイントが含まれています");
    }

    // 新しい試合を作成
    let userIds = users.map((user, index) => ({
      userId: user._id,
      point: req.body[`user${index + 1}`].point,
    }));

    // ポイントの高い順に並べ替え
    userIds = userIds.sort((a, b) => b.point - a.point);
    console.log("userIds: ", userIds);

    // データベースの型
    const newMatch = new Match({
      playNumber: req.body.playNumber,
      user1: userIds[0],
      user2: userIds[1],
      user3: userIds[2],
      user4: req.body.playNumber === 4 ? userIds[3] : null,
    });

    // 試合をデータベースに保存
    const match = await newMatch.save();

    res.status(200).json("登録が完了しました");
  } catch (err) {
    console.log("試合登録に失敗: ", err);
    res.status(500).json("サーバーでエラーが発生しました");
  }
});

// 全試合
router.get("/", async (req, res) => {
  try {
    // console.log("全試合取得開始");
    // MongoDBから全試合取得
    const allMatches = await Match.find(); // データベースから全試合を取得
    // console.log("-----全試合一覧-----");
    // console.log(allMatches);
    // console.log("----------");
    console.log("全試合送信完了");
    res.status(200).json(allMatches);
  } catch (err) {
    console.log("全試合送信失敗: ", err);
    res.status(500).json("サーバーでエラーが発生しました");
  }
});

// ログインしているユーザーが参加した試合
router.get("/you", authenticateToken, async (req, res) => {
  try {
    // console.log("ログインユーザーの試合取得開始");

    // MongoDBからユーザーの試合取得
    const userId = req.user.id;

    const userMatches = await Match.find({
      $or: [
        { "user1.userId": userId },
        { "user2.userId": userId },
        { "user3.userId": userId },
        { $and: [{ "user4.userId": userId }, { playNumber: 4 }] },
      ],
    });

    // console.log(`-----${req.user.email}'s matches-----`);
    // console.log(userMatches);
    // console.log("----------");
    console.log("ユーザー試合送信完了");

    res.status(200).json(userMatches);
  } catch (err) {
    console.log("ユーザー試合送信失敗: ", err);
    res.status(500).json("サーバーでエラーが発生しました");
  }
});

module.exports = router;
