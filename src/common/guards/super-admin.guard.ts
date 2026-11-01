import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRoleEnum } from '../../enums/UserRoleEnum';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || (user.role !== UserRoleEnum.SUPER_ADMIN && user.role !== 'super_admin')) {
      throw new ForbiddenException('Access denied. Super Admin privileges required.');
    }

    return true;
  }
}
