import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    surName: {
      type: String,
      default: "-",
    },
    password: {
      type: String,
      required: true,
    },
    birthday: {
      type: String,
      default: "-",
    },
    company: {
      type: String,
      default: "-",
    },
    avatar: {
      type: String,
      default:
        "https://res.cloudinary.com/djmeybzjk/image/upload/v1756449865/pngfind.com-placeholder-png-6104451_awuxxc.png",
    },
    teams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "teams",
      },
    ],
  },
  { timestamps: true }
);

const UserModel = mongoose.model("users", UserSchema);
export default UserModel;
