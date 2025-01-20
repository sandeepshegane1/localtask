import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  otp: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // OTP expires after 5 minutes
  },
  verified: {
    type: Boolean,
    default: false
  }
});

const OTP = mongoose.model('OTP', otpSchema);
export default OTP;
