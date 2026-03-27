import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
        },
        value: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

const SettingsModel = mongoose.model('settings', SettingsSchema);
export default SettingsModel;
