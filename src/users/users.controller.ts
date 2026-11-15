import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  ForbiddenException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { BusinessesService } from '../businesses/businesses.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { UserRoleEnum } from '../enums/UserRoleEnum';
import {
  APP_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from '../common/constants/permissions.constant';
import * as bcrypt from 'bcryptjs';
import { Types } from 'mongoose';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly businessesService: BusinessesService,
  ) {}

  private getBusinessId(req: any): string {
    const businessId = req.user?.business?._id || req.user?.business;
    if (!businessId) {
      throw new NotFoundException('No business linked to the current user');
    }
    return businessId.toString();
  }

  private checkCanManageTeam(req: any) {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    const role = user.role;
    if (
      role === UserRoleEnum.ADMIN ||
      role === 'admin' ||
      role === UserRoleEnum.MANAGER ||
      role === 'manager' ||
      role === UserRoleEnum.SUPER_ADMIN ||
      role === 'super_admin'
    ) {
      return;
    }

    const permissions: string[] =
      Array.isArray(user.permissions) && user.permissions.length > 0
        ? user.permissions
        : DEFAULT_ROLE_PERMISSIONS[role] || [];

    if (!permissions.includes(APP_PERMISSIONS.TEAM_MANAGE)) {
      throw new ForbiddenException(
        'Access denied. Only business administrators, managers, or authorized team leads can manage team members.',
      );
    }
  }

  @Get()
  async findAll(@Request() req: any) {
    this.checkCanManageTeam(req);
    const businessId = this.getBusinessId(req);
    const users = await this.usersService.findAllByBusiness(businessId);
    return users.map((u) => {
      const uObj = u.toObject ? u.toObject() : { ...u };
      if (!uObj.permissions || !Array.isArray(uObj.permissions) || uObj.permissions.length === 0) {
        uObj.permissions = DEFAULT_ROLE_PERMISSIONS[uObj.role] || [];
      }
      return uObj;
    });
  }

  @Post()
  async createTeamMember(@Request() req: any, @Body() dto: CreateTeamMemberDto) {
    this.checkCanManageTeam(req);
    const businessId = this.getBusinessId(req);

    // STRICT SECURITY CHECK 1: Never allow creating super_admin through API or web
    const roleStr = String(dto.role || '').toLowerCase();
    if (
      dto.role === UserRoleEnum.SUPER_ADMIN ||
      roleStr === 'super_admin' ||
      roleStr.includes('super')
    ) {
      throw new ForbiddenException('Creating a Super Admin account is strictly forbidden.');
    }

    // Validate allowed roles for business team members
    const allowedRoles = [
      UserRoleEnum.MANAGER,
      UserRoleEnum.CASHIER,
      UserRoleEnum.ACCOUNTANT,
      UserRoleEnum.STAFF,
      UserRoleEnum.ADMIN,
    ];
    if (!allowedRoles.includes(dto.role)) {
      throw new BadRequestException(
        `Invalid role specified. Allowed team roles are: ${allowedRoles.filter(r => r !== UserRoleEnum.SUPER_ADMIN).join(', ')}`,
      );
    }

    // STRICT SECURITY CHECK 2: One email can have only one role across the system
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existing = await this.usersService.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException(
        `The email "${normalizedEmail}" is already registered with role "${existing.role}". One email can have only one role.`,
      );
    }

    // Determine granular permissions (custom selected or role defaults)
    const effectivePermissions =
      Array.isArray(dto.permissions) && dto.permissions.length > 0
        ? dto.permissions
        : DEFAULT_ROLE_PERMISSIONS[dto.role] || [];

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user assigned to caller's business
    const user = await this.usersService.create({
      full_name: dto.full_name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: dto.role,
      permissions: effectivePermissions,
      business: new Types.ObjectId(businessId),
    });

    const userObj = user.toObject ? user.toObject() : { ...user };
    delete (userObj as any).password;
    return userObj;
  }

  @Patch(':id')
  async updateTeamMember(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTeamMemberDto,
  ) {
    this.checkCanManageTeam(req);
    const businessId = this.getBusinessId(req);

    // Target user must exist and belong to caller's business
    const targetUser = await this.usersService.findById(id);
    if (!targetUser) {
      throw new NotFoundException('Team member not found');
    }
    const targetBusinessId = (targetUser.business as any)?._id?.toString() || targetUser.business?.toString();
    if (targetBusinessId !== businessId) {
      throw new ForbiddenException('You can only update members belonging to your own business');
    }

    // STRICT SECURITY CHECK: Never allow assigning super_admin through API or web
    if (dto.role) {
      const roleStr = String(dto.role).toLowerCase();
      if (
        dto.role === UserRoleEnum.SUPER_ADMIN ||
        roleStr === 'super_admin' ||
        roleStr.includes('super')
      ) {
        throw new ForbiddenException('Assigning a Super Admin role is strictly forbidden.');
      }

      const allowedRoles = [
        UserRoleEnum.MANAGER,
        UserRoleEnum.CASHIER,
        UserRoleEnum.ACCOUNTANT,
        UserRoleEnum.STAFF,
        UserRoleEnum.ADMIN,
      ];
      if (!allowedRoles.includes(dto.role)) {
        throw new BadRequestException(
          `Invalid role specified. Allowed team roles are: ${allowedRoles.filter(r => r !== UserRoleEnum.SUPER_ADMIN).join(', ')}`,
        );
      }
    }

    // Do not allow demoting primary business owner
    const business = await this.businessesService.findById(businessId);
    const ownerId = (business?.owner as any)?._id?.toString() || business?.owner?.toString();
    if (targetUser._id.toString() === ownerId && dto.role && dto.role !== UserRoleEnum.ADMIN) {
      throw new ForbiddenException('The primary business owner role cannot be changed.');
    }

    const updateData: any = {};
    if (dto.full_name) updateData.full_name = dto.full_name.trim();
    if (dto.role) updateData.role = dto.role;
    if (dto.permissions !== undefined && Array.isArray(dto.permissions)) {
      updateData.permissions = dto.permissions;
    } else if (dto.role && dto.permissions === undefined) {
      updateData.permissions = DEFAULT_ROLE_PERMISSIONS[dto.role] || [];
    }
    if (dto.password && dto.password.length >= 6) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.usersService.update(id, updateData);
    if (!updated) throw new NotFoundException('Failed to update member');
    const userObj = updated.toObject ? updated.toObject() : { ...updated };
    delete (userObj as any).password;
    return userObj;
  }

  @Delete(':id')
  async removeTeamMember(@Request() req: any, @Param('id') id: string) {
    this.checkCanManageTeam(req);
    const businessId = this.getBusinessId(req);

    const targetUser = await this.usersService.findById(id);
    if (!targetUser) {
      throw new NotFoundException('Team member not found');
    }
    const targetBusinessId = (targetUser.business as any)?._id?.toString() || targetUser.business?.toString();
    if (targetBusinessId !== businessId) {
      throw new ForbiddenException('You can only remove members belonging to your own business');
    }

    // Prevent deleting the primary business owner
    const business = await this.businessesService.findById(businessId);
    const ownerId = (business?.owner as any)?._id?.toString() || business?.owner?.toString();
    if (targetUser._id.toString() === ownerId || targetUser.role === UserRoleEnum.ADMIN) {
      throw new ForbiddenException('The primary business owner cannot be removed.');
    }

    await this.usersService.remove(id);
    return { message: 'Team member removed successfully' };
  }
}
