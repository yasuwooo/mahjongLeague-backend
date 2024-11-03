const jwt = require("jsonwebtoken");

// auth_tokenを検証するミドルウェア
const authenticateToken = (req, res, next) => {
  const token = req.cookies.auth_token; // クッキーの中に入っているauth_tokenを取り出す
  // console.log(`auth_tokenの検証ミドルウェアの実行開始`);
  if (!token) {
    // auth_tokenがあるか確認
    console.log(`auth_token middleware: auth_token not found`);
    return res
      .status(401)
      .json("認証トークンがありません 再度ログインしてください");
  }

  // auth_tokenの検証
  jwt.verify(token, process.env.JWT_SECRETKEY, async (err, user) => {
    if (err) {
      console.log(`auth_token middleware: auth_tokenが無効です`);
      return res
        .status(403)
        .json(
          "無効な認証トークンです 正しくログインができていないのでお使いの端末を再起動してください"
        );
    }

    // 正しいトークンなら、リクエストオブジェクトにuserを保存
    console.log(`auth_token middleware: 認証完了`);
    req.user = user;
    next(); // ミドルウェアにはnext()が必要
  });
};

module.exports = authenticateToken;
