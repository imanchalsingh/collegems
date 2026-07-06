const Settings = require('../models/Settings');

// Get settings
const getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        
        if (!settings) {
            // Create default settings if none exist
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
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Update settings
const updateSettings = async (req, res) => {
    try {
        const { confirmations } = req.body;
        
        let settings = await Settings.findOne();
        
        if (!settings) {
            settings = new Settings();
        }
        
        // Update confirmation settings
        if (confirmations) {
            settings.confirmations = {
                delete: confirmations.delete !== undefined ? confirmations.delete : settings.confirmations.delete,
                publish: confirmations.publish !== undefined ? confirmations.publish : settings.confirmations.publish,
                archive: confirmations.archive !== undefined ? confirmations.archive : settings.confirmations.archive,
                update: confirmations.update !== undefined ? confirmations.update : settings.confirmations.update
            };
        }
        
        settings.updatedBy = req.user.id;
        settings.updatedAt = Date.now();
        
        await settings.save();
        
        res.json({
            success: true,
            message: 'Settings updated successfully',
            data: settings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = { getSettings, updateSettings };