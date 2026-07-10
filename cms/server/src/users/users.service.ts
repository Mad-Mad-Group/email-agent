import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

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

  async findById(id: string): Promise<User | null> {
    return this.userModel
      .findOne({ _id: id, deleted_at: null })
      .select('-password')
      .exec();
  }

  async findByIdWithPassword(id: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ _id: id, deleted_at: null })
      .exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email, deleted_at: null })
      .exec();
  }

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const user = new this.userModel(createUserDto);
    return user.save();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(
        id,
        { ...updateUserDto, updated_at: new Date() },
        { new: true },
      )
      .select('-password')
      .exec();
  }

  async delete(id: string): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(
        id,
        { deleted_at: new Date() },
        { new: true },
      )
      .select('-password')
      .exec();
  }

  async setResetToken(id: string, token: string, expiry: Date): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, {
      resetToken: token,
      resetTokenExpiry: expiry,
      updated_at: new Date(),
    }).exec();
  }

  async findByResetToken(token: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
      deleted_at: null,
    }).exec();
  }

  async clearResetToken(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, {
      resetToken: null,
      resetTokenExpiry: null,
      updated_at: new Date(),
    }).exec();
  }

  async getNotificationPrefs(id: string) {
    const user = await this.userModel.findById(id).select('notification_prefs').lean().exec();
    return user?.notification_prefs ?? { email_on_complete: false, browser_on_complete: false };
  }

  async updateNotificationPrefs(
    id: string,
    prefs: { email_on_complete?: boolean; browser_on_complete?: boolean },
  ) {
    const $set: Record<string, boolean> = {};
    if (prefs.email_on_complete !== undefined)
      $set['notification_prefs.email_on_complete'] = prefs.email_on_complete;
    if (prefs.browser_on_complete !== undefined)
      $set['notification_prefs.browser_on_complete'] = prefs.browser_on_complete;
    if (Object.keys($set).length === 0) return this.getNotificationPrefs(id);
    await this.userModel.findByIdAndUpdate(id, { $set, updated_at: new Date() }).exec();
    return this.getNotificationPrefs(id);
  }
}
