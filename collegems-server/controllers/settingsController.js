const Settings = require('../models/Settings');
const logger = require('../utils/logger');

const CONFIRMATION_FIELDS = ['delete', 'publish', 'archive', 'update'];

function validateBoolean(value, fieldName) {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'boolean') {
    return {
      valid: false,
      error: `${fieldName} must be a boolean value (true or false)`
    };
  }
  return { valid: true };
}

function validateConfirmationSettings(confirmations) {
  const errors = [];

  for (const field of CONFIRMATION_FIELDS) {
    if (confirmations[field] !== undefined) {
      const validation = validateBoolean(confirmations[field], field);
      if (!validation.valid) {
        errors.push(validation.error);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

const getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        
        if (!settings) {
            settings = await Settings.create({
                confirmations: {
                    delete: true,
                    publish: true,
                    archive: true,
                    update: false
                }
            });
        }
        
        res.json({ success: true, data: settings });
    } catch (error) {
        logger.error('Error getting settings:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

const updateSettings = async (req, res) => {
    try {
        const { confirmations } = req.body;
        
        if (!confirmations) {
            return res.status(400).json({
                success: false,
                error: 'Confirmations object is required'
            });
        }

        if (typeof confirmations !== 'object' || Array.isArray(confirmations)) {
            return res.status(400).json({
                success: false,
                error: 'Confirmations must be an object'
            });
        }

        const validation = validateConfirmationSettings(confirmations);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validation.errors
            });
        }
        
        let settings = await Settings.findOne();
        
        if (!settings) {
            settings = new Settings();
        }
        
        settings.confirmations = {
            delete: confirmations.delete !== undefined ? confirmations.delete : settings.confirmations.delete,
            publish: confirmations.publish !== undefined ? confirmations.publish : settings.confirmations.publish,
            archive: confirmations.archive !== undefined ? confirmations.archive : settings.confirmations.archive,
            update: confirmations.update !== undefined ? confirmations.update : settings.confirmations.update
        };
        
        settings.updatedBy = req.user ? req.user.id : null;
        settings.updatedAt = Date.now();
        
        await settings.save();

        logger.info('Settings updated successfully', { updatedBy: req.user?.id });
        
        res.json({
            success: true,
            message: 'Settings updated successfully',
            data: settings
        });
    } catch (error) {
        logger.error('Error updating settings:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = { 
    getSettings, 
    updateSettings,
    validateConfirmationSettings,
    validateBoolean,
    CONFIRMATION_FIELDS
};