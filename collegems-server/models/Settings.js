const mongoose = require('mongoose');
const DEFAULT_ACADEMIC_LABELS = require("../constants/academicLabels");
const settingsSchema = new mongoose.Schema({
    confirmations: {
        delete: {
            type: Boolean,
            default: true,
            description: 'Show confirmation before deleting'
        },
        publish: {
            type: Boolean,
            default: true,
            description: 'Show confirmation before publishing'
        },
        archive: {
            type: Boolean,
            default: true,
            description: 'Show confirmation before archiving'
        },
        update: {
            type: Boolean,
            default: false,
            description: 'Show confirmation before updating'
        }
    },

    academicLabels: {
        type: Object,
        default: () => ({ ...DEFAULT_ACADEMIC_LABELS }),
    },

    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Settings', settingsSchema);