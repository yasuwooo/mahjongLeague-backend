const router = require("express").Router();
const User = require("../models/User");
const Match = require("../models/Match");
const {
  FIRSTPOINT_4P,
  NUMBER1_4P,
  FIRSTPOINT_3P,
  NUMBER1_3P,
  NUMBER2_4P,
  NUMBER2_3P,
  NUMBER3_3P,
  NUMBER3_4P,
  NUMBER4_4P,
} = require("../symbolicConstant");

router.get("/", async (req, res) => {
  try {
    // console.log("ランキング情報取得開始");
    const allUsers = await User.find();
    const allMatches = await Match.find();

    // 各ユーザーの順位データを初期化
    const allUserStats = allUsers
      .filter((user) => user.username !== process.env.NO_EXSISTED_USERNAME)
      .map((user) => ({
        userId: user._id.toString(),
        username: user.username,
        points: 0,
        firstPlace: 0,
        secondPlace: 0,
        thirdPlace: 0,
        fourthPlace: 0,
      }));

    allMatches.forEach((match) => {
      for (let i = 1; i <= match.playNumber; i++) {
        const userStat = allUserStats.find(
          (stat) => stat.userId === match[`user${i}`].userId.toString()
        );
        if (userStat) {
          switch (i) {
            case 1:
              userStat.firstPlace += 1;
              if (match.playNumber === 4) {
                userStat.points +=
                  (match.user1.point - FIRSTPOINT_4P) / 1000 + NUMBER1_4P;
              } else {
                userStat.points +=
                  (match.user1.point - FIRSTPOINT_3P) / 1000 + NUMBER1_3P;
              }
              break;
            case 2:
              userStat.secondPlace += 1;
              if (match.playNumber === 4) {
                userStat.points +=
                  (match.user2.point - FIRSTPOINT_4P) / 1000 + NUMBER2_4P;
              } else {
                userStat.points +=
                  (match.user2.point - FIRSTPOINT_3P) / 1000 + NUMBER2_3P;
              }
              break;
            case 3:
              userStat.thirdPlace += 1;
              if (match.playNumber === 4) {
                userStat.points +=
                  (match.user3.point - FIRSTPOINT_4P) / 1000 + NUMBER3_4P;
              } else {
                userStat.points +=
                  (match.user3.point - FIRSTPOINT_3P) / 1000 + NUMBER3_3P;
              }
              break;
            case 4:
              userStat.fourthPlace += 1;
              if (match.playNumber === 4) {
                userStat.points +=
                  (match.user4.point - FIRSTPOINT_4P) / 1000 + NUMBER4_4P;
              }
              break;
            default:
              break;
          }
        }
      }
    });

    const sortedAllUserStats = [...allUserStats].sort(
      (a, b) => b.points - a.points
    );

    const response = sortedAllUserStats;
    // console.log(`-----ユーザー情報取得成功-----`);
    // console.log(response);
    // console.log(`----------`);
    res.status(200).json(response);
  } catch (err) {
    console.log(err);
    res.status(500).json("サーバーエラーが発生しました");
  }
});

module.exports = router;
