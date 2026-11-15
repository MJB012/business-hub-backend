import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PermissionMode } from '../decorators/permissions.decorator';
import { UserRoleEnum } from '../../enums/UserRoleEnum';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  const createMockContext = (user: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should grant access if no permissions are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext({ role: UserRoleEnum.CASHIER });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should grant access if user is admin regardless of permissions', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'permissions') return ['expenses:view'];
      return PermissionMode.ALL;
    });
    const context = createMockContext({ role: UserRoleEnum.ADMIN, permissions: [] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should grant access if cashier has required permission', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'permissions') return ['sales:create'];
      return PermissionMode.ALL;
    });
    const context = createMockContext({
      role: UserRoleEnum.CASHIER,
      permissions: ['sales:view', 'sales:create', 'inventory:view'],
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if cashier accesses expenses:view', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'permissions') return ['expenses:view'];
      return PermissionMode.ALL;
    });
    const context = createMockContext({
      role: UserRoleEnum.CASHIER,
      permissions: ['sales:view', 'sales:create', 'inventory:view'],
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should fall back to default role permissions if user.permissions is empty', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'permissions') return ['sales:view'];
      return PermissionMode.ALL;
    });
    const context = createMockContext({
      role: UserRoleEnum.CASHIER,
      permissions: [],
    });
    expect(guard.canActivate(context)).toBe(true);
  });
});
