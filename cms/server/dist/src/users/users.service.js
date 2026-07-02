"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("./schemas/user.schema");
let UsersService = class UsersService {
    userModel;
    constructor(userModel) {
        this.userModel = userModel;
    }
    async findAll(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            this.userModel
                .find({ deleted_at: null })
                .select('-password')
                .skip(skip)
                .limit(limit)
                .sort({ created_at: -1 })
                .exec(),
            this.userModel.countDocuments({ deleted_at: null }).exec(),
        ]);
        return { items, total, page, limit };
    }
    async findById(id) {
        return this.userModel
            .findOne({ _id: id, deleted_at: null })
            .select('-password')
            .exec();
    }
    async findByIdWithPassword(id) {
        return this.userModel
            .findOne({ _id: id, deleted_at: null })
            .exec();
    }
    async findByEmail(email) {
        return this.userModel
            .findOne({ email, deleted_at: null })
            .exec();
    }
    async create(createUserDto) {
        const user = new this.userModel(createUserDto);
        return user.save();
    }
    async update(id, updateUserDto) {
        return this.userModel
            .findByIdAndUpdate(id, { ...updateUserDto, updated_at: new Date() }, { new: true })
            .select('-password')
            .exec();
    }
    async delete(id) {
        return this.userModel
            .findByIdAndUpdate(id, { deleted_at: new Date() }, { new: true })
            .select('-password')
            .exec();
    }
    async setResetToken(id, token, expiry) {
        await this.userModel.findByIdAndUpdate(id, {
            resetToken: token,
            resetTokenExpiry: expiry,
            updated_at: new Date(),
        }).exec();
    }
    async findByResetToken(token) {
        return this.userModel.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: new Date() },
            deleted_at: null,
        }).exec();
    }
    async clearResetToken(id) {
        await this.userModel.findByIdAndUpdate(id, {
            resetToken: null,
            resetTokenExpiry: null,
            updated_at: new Date(),
        }).exec();
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], UsersService);
//# sourceMappingURL=users.service.js.map