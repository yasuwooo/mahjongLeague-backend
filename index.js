require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const csurf = require("csurf");
const xss = require("xss-clean");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

// セキュリティ設定
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(express.json());
app.use(cookieParser());
app.use(xss());

// CORS設定
app.use(
  cors({
    origin: process.env.FRONTEND_URL, // フロントエンドのURL
    credentials: true, // Cookieの送信を許可
  })
);

app.options("*", cors()); // プリフライトリクエストを許可

// CSRFプロテクション
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  },
});

// レートリミットの設定
const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分
  max: 500, // 1分間に500回までのリクエスト
  message:
    "短時間にリクエストが多すぎます。しばらくしてから再試行してください。",
});
app.use("/", rateLimiter);

// CSRFトークンを取得するためのエンドポイント
app.get("/csrf-token", csrfProtection, (req, res) => {
  const csrfToken = req.csrfToken();
  console.log("csrfToken: ", csrfToken);
  // res.set("X-CSRF-Token", csrfToken);
  res.status(200).json({ "X-CSRF-Token": csrfToken });
});

// DB接続
const mongoose = require("mongoose");
mongoose.set("strictQuery", true);

mongoose
  .connect(process.env.MONGOURL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// 各種ルート
const registerRoute = require("./routes/register");
const loginRoute = require("./routes/login");
const changePasswordRoute = require("./routes/changePassword");
const changeUserDataRoute = require("./routes/changeUserData");
const imageRoute = require("./routes/image");
const userRoute = require("./routes/user");
const matchRoute = require("./routes/match");
const rankingRoute = require("./routes/ranking");

// ルートごとにCSRFプロテクションを適用
app.use("/register", csrfProtection, registerRoute);
app.use("/login", csrfProtection, loginRoute);
app.use("/changepassword", csrfProtection, changePasswordRoute);
app.use("/changeuserdata", csrfProtection, changeUserDataRoute);
app.use("/image", csrfProtection, imageRoute);
app.use("/user", csrfProtection, userRoute);
app.use("/match", csrfProtection, matchRoute);
app.use("/ranking", csrfProtection, rankingRoute);

// サーバー起動
app.listen(process.env.PORT, () => {
  console.log(
    `Server is running at ${process.env.API_URL || "http://localhost"}:${
      process.env.PORT
    }`
  );
});
