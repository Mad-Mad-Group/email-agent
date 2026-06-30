import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, RoleDocument } from './schemas/role.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(@InjectModel(Role.name) private roleModel: Model<RoleDocument>) {}

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.roleModel.find().skip(skip).limit(limit).exec(),
      this.roleModel.countDocuments().exec(),
    ]);
    return { items, total, page, limit };
  }

  async findById(id: string): Promise<RoleDocument | null> {
    return this.roleModel.findById(id).exec();
  }

  async findByName(name: string): Promise<RoleDocument | null> {
    return this.roleModel.findOne({ name }).exec();
  }

  async create(createRoleDto: CreateRoleDto): Promise<RoleDocument> {
    const role = new this.roleModel(createRoleDto);
    return role.save();
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<RoleDocument | null> {
    return this.roleModel
      .findByIdAndUpdate(id, { ...updateRoleDto, updated_at: new Date() }, { new: true })
      .exec();
  }

  async delete(id: string): Promise<RoleDocument | null> {
    return this.roleModel.findByIdAndDelete(id).exec();
  }
}
