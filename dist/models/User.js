"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userSchema = new mongoose_1.default.Schema({
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    name: { type: String, trim: true, default: '' },
    passwordHash: { type: String },
    role: { type: String, enum: ['passenger', 'driver', 'admin'], default: 'passenger' },
}, { timestamps: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1 });
userSchema.pre('validate', function (next) {
    if (!this.email && !this.phone) {
        next(new Error('Either email or phone is required'));
    }
    else {
        next();
    }
});
exports.UserModel = mongoose_1.default.model('User', userSchema);
async function hashPassword(password) {
    return bcryptjs_1.default.hash(password, 12);
}
async function verifyPassword(password, hash) {
    if (!hash)
        return false;
    return bcryptjs_1.default.compare(password, hash);
}
