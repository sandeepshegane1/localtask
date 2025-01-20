import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['CLIENT', 'PROVIDER', 'WORKER'],
    required: true
  },
  category: {
    type: String,
    required: function() {
      return this.role === 'PROVIDER';
    }
  },
  skills: [{
    type: String
  }],
  profilePhoto: {
    type: String,
    default: null
  },
  location: {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point']
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(v) {
          return v.length === 2;
        },
        message: 'Coordinates must be an array of [longitude, latitude]'
      }
    }
  }
}, {
  timestamps: true
});

// Create indexes
userSchema.index({ location: '2dsphere' });
userSchema.index({ category: 1 });
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);

export default User;
