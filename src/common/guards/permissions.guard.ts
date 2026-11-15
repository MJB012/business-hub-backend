import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  PERMISSIONS_MODE_KEY,
  PermissionMode,
} from '../decorators/permissions.decorator';
import { DEFAULT_ROLE_PERMISSIONS } from '../constants/permissions.constant';
import { UserRoleEnum } from '../../enums/UserRoleEnum';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permission metadata is set, access is granted
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Platform Super Admin and Business Owners (Admins) bypass granular checks
    if (
      user.role === UserRoleEnum.ADMIN ||
      user.role === 'admin' ||
      user.role === UserRoleEnum.SUPER_ADMIN ||
      user.role === 'super_admin'
    ) {
      return true;
    }

    // Retrieve user permissions with fallback to role defaults
    const userPermissions: string[] =
      Array.isArray(user.permissions) && user.permissions.length > 0
        ? user.permissions
        : DEFAULT_ROLE_PERMISSIONS[user.role] || [];

    const mode =
      this.reflector.getAllAndOverride<PermissionMode>(PERMISSIONS_MODE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || PermissionMode.ALL;

    const hasPermission =
      mode === PermissionMode.ANY
        ? requiredPermissions.some((p) => userPermissions.includes(p))
        : requiredPermissions.every((p) => userPermissions.includes(p));

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have sufficient permissions to perform this action',
      );
    }

    return true;
  }
}
