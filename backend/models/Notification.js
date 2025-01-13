import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['QUICK_SERVICE_REQUEST', 'TASK_UPDATE', 'PAYMENT', 'OTHER'],
    required: true
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['READ', 'UNREAD'],
    default: 'UNREAD'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for better query performance
notificationSchema.index({ recipient: 1, status: 1 });
notificationSchema.index({ task: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
