import mongoose from 'mongoose';

const TempUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  otp: {
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  createdAt: { type: Date, default: Date.now, expires: 300 },
});

const TempUserModel = mongoose.model('tempUsers', TempUserSchema);
export default TempUserModel;
