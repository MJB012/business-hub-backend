import { applyDecorators, SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSIONS_MODE_KEY = 'permissions_mode';

export enum PermissionMode {
  ALL = 'ALL',
  ANY = 'ANY',
}

/**
 * Requires ALL of the specified permissions (logical AND).
 */
export const RequirePermissions = (...permissions: string[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    SetMetadata(PERMISSIONS_MODE_KEY, PermissionMode.ALL),
  );

/**
 * Requires AT LEAST ONE of the specified permissions (logical OR).
 */
export const RequireAnyPermissions = (...permissions: string[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    SetMetadata(PERMISSIONS_MODE_KEY, PermissionMode.ANY),
  );
