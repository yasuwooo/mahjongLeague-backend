const express = require("express");
const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");
const multer = require("multer");
const authenticateToken = require("../middleware/authenticateToken");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/User");
const router = express.Router();

// MongoDBとGridFSBucketの設定
let gfs;
mongoose.connection.once("open", () => {
  const db = mongoose.connection;
  gfs = new GridFSBucket(db, { bucketName: "uploads" });
  console.log("GridFSBucket initialized");
});

// Multerの設定：画像ファイルを一時的に保存する
const storage = multer.memoryStorage(); // メモリ内に一時保存
const upload = multer({ storage });

// 画像アップロードのエンドポイント
router.post(
  "/upload",
  authenticateToken,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "ファイルがありません" });
    }

    const fileName = `${uuidv4()}-${req.file.originalname}`;

    // GridFSBucketでファイルを保存
    const uploadStream = gfs.openUploadStream(fileName, {
      contentType: req.file.mimetype,
    });

    uploadStream.end(req.file.buffer); // バッファからアップロード

    uploadStream.on("finish", async () => {
      const uploadUser = await User.findById(req.user.id);
      // もし登録されているアイコン名が初期値じゃなかったら、uploadUser.iconの画像ファイルを消す
      if (uploadUser.icon !== "NOAVATAR.png") {
        try {
          const file = await gfs.find({ filename: uploadUser.icon }).toArray();
          if (file.length > 0) {
            // ファイルが存在する場合、削除
            await gfs.delete(file[0]._id);
            console.log(`既存のファイル ${uploadUser.icon} が削除されました`);
          }
        } catch (err) {
          console.error("ファイルの削除中にエラーが発生しました:", err);
        }
      }
      uploadUser.icon = fileName;
      await uploadUser.save();
      res.status(201).json(`ファイル: ${fileName}がアップロードされました`);
    });

    uploadStream.on("error", (err) => {
      console.error("-----画像アップロードエラー-----", err);
      res.status(500).json("ファイルのアップロード中にエラーが発生しました");
    });
  }
);

// 画像取得のエンドポイント
router.get("/file/:username", async (req, res) => {
  try {
    const uploadUser = await User.findOne({ username: req.params.username });
    if (!uploadUser) {
      return res.status(404).json("ログインし直してください");
    }
    const filename = uploadUser.icon;

    const files = await gfs.find({ filename }).toArray();

    if (!files || files.length === 0) {
      return res.status(404).json("ファイルが見つかりません");
    }
    console.log(`画像取得完了: /file/${filename}`);
    const readStream = gfs.openDownloadStreamByName(filename);
    readStream.pipe(res);
  } catch (error) {
    console.error("-----画像取得失敗-----\n", error);
    res.status(500).json("サーバーエラーが発生しました");
  }
});

module.exports = router;
