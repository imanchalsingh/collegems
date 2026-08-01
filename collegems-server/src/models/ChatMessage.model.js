import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudyGroup",
      required: [true, 'Group ID is required']
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, 'Sender ID is required']
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      minlength: [1, 'Message cannot be empty'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
      validate: {
        validator: function(value) {
          return value && value.trim().length > 0;
        },
        message: 'Message cannot be empty or contain only whitespace'
      }
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatMessage"
    },
    attachments: [{
      type: {
        type: String,
        enum: ['image', 'video', 'audio', 'document', 'file']
      },
      url: {
        type: String,
        trim: true
      },
      name: {
        type: String,
        trim: true
      },
      size: {
        type: Number,
        min: [0, 'File size cannot be negative']
      }
    }]
  },
  { timestamps: true }
);

chatMessageSchema.index({ groupId: 1, createdAt: -1 });
chatMessageSchema.index({ senderId: 1, createdAt: -1 });
chatMessageSchema.index({ groupId: 1, isDeleted: 1 });

chatMessageSchema.pre('save', function(next) {
  if (this.content) {
    this.content = this.content.trim();
  }
  if (this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

chatMessageSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update && update.content) {
    update.content = update.content.trim();
  }
  if (update && update.isDeleted === true && !update.deletedAt) {
    update.deletedAt = new Date();
  }
  next();
});

chatMessageSchema.statics.getGroupMessages = function(groupId, limit = 50, before = null) {
  const query = { 
    groupId, 
    isDeleted: false 
  };
  
  if (before) {
    query.createdAt = { $lt: before };
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('senderId', 'name email avatar')
    .populate('replyTo');
};

chatMessageSchema.statics.markAsRead = function(messageIds, userId) {
  return this.updateMany(
    {
      _id: { $in: messageIds },
      readBy: { $ne: userId }
    },
    {
      $addToSet: { readBy: userId }
    }
  );
};

chatMessageSchema.statics.deleteMessage = function(messageId, userId) {
  return this.findOneAndUpdate(
    {
      _id: messageId,
      senderId: userId
    },
    {
      isDeleted: true,
      deletedAt: new Date()
    },
    { new: true }
  );
};

chatMessageSchema.statics.getUnreadCount = function(groupId, userId) {
  return this.countDocuments({
    groupId,
    isDeleted: false,
    readBy: { $ne: userId }
  });
};

chatMessageSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

export default mongoose.model("ChatMessage", chatMessageSchema);