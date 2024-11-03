const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

const mongoose = require("mongoose");

const MatchSchema = new mongoose.Schema({
  playOffTime: {
    type: Date,
    default: () => dayjs().tz("Asia/Tokyo").toDate().toISOString(),
  },
  playNumber: {
    type: Number,
    required: true,
  },
  user1: {
    userId: {
      type: String,
      required: true,
    },
    point: {
      type: Number,
      required: true,
    },
  },
  user2: {
    userId: {
      type: String,
      required: true,
    },
    point: {
      type: Number,
      required: true,
    },
  },
  user3: {
    userId: {
      type: String,
      required: true,
    },
    point: {
      type: Number,
      required: true,
    },
  },
  user4: {
    type: {
      userId: {
        type: String,
        default: null,
      },
      point: {
        type: Number,
        default: null,
      },
    },
    _id: false, // サブドキュメントに _id が生成されないように設定
    default: null,
  },
});

// 保存前に日本時間に変換
MatchSchema.pre("save", function (next) {
  this.playOffTime = dayjs(this.playOffTime)
    .tz("Asia/Tokyo")
    .toDate()
    .toISOString();
  next();
});

module.exports = mongoose.model("Match", MatchSchema);
