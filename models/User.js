const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 15,
  },
  email: {
    type: String,
    required: true,
    maxlength: 100,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    maxlength: 100,
  },
  desc: {
    type: String,
    default: "",
    maxlength: 150,
  },
  icon: {
    type: String,
    default: "NOAVATAR.png",
  },
  verificationToken: {
    type: String,
  },
});

module.exports = mongoose.model("User", UserSchema);
