import { UserRoleEnum } from '../../enums/UserRoleEnum';

export const APP_PERMISSIONS = {
  // Sales & POS
  SALES_VIEW: 'sales:view',
  SALES_CREATE: 'sales:create',
  SALES_EDIT: 'sales:edit',
  SALES_DELETE: 'sales:delete',

  // Inventory & Stock
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_MANAGE: 'inventory:manage',
  INVENTORY_DELETE: 'inventory:delete',

  // Expenses & Cash Outflow
  EXPENSES_VIEW: 'expenses:view',
  EXPENSES_MANAGE: 'expenses:manage',
  EXPENSES_DELETE: 'expenses:delete',

  // Suppliers & Categories
  SUPPLIERS_MANAGE: 'suppliers:manage',
  CATEGORIES_MANAGE: 'categories:manage',

  // Reports & Analytics
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',

  // Team & Staff
  TEAM_MANAGE: 'team:manage',
} as const;

export type AppPermissionKey = keyof typeof APP_PERMISSIONS;
export type AppPermissionValue = (typeof APP_PERMISSIONS)[AppPermissionKey];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  [UserRoleEnum.ADMIN]: Object.values(APP_PERMISSIONS),
  [UserRoleEnum.SUPER_ADMIN]: Object.values(APP_PERMISSIONS),
  [UserRoleEnum.MANAGER]: [
    APP_PERMISSIONS.SALES_VIEW,
    APP_PERMISSIONS.SALES_CREATE,
    APP_PERMISSIONS.SALES_EDIT,
    APP_PERMISSIONS.SALES_DELETE,
    APP_PERMISSIONS.INVENTORY_VIEW,
    APP_PERMISSIONS.INVENTORY_MANAGE,
    APP_PERMISSIONS.INVENTORY_DELETE,
    APP_PERMISSIONS.EXPENSES_VIEW,
    APP_PERMISSIONS.EXPENSES_MANAGE,
    APP_PERMISSIONS.SUPPLIERS_MANAGE,
    APP_PERMISSIONS.CATEGORIES_MANAGE,
    APP_PERMISSIONS.REPORTS_VIEW,
    APP_PERMISSIONS.REPORTS_EXPORT,
  ],
  [UserRoleEnum.CASHIER]: [
    APP_PERMISSIONS.SALES_VIEW,
    APP_PERMISSIONS.SALES_CREATE,
    APP_PERMISSIONS.INVENTORY_VIEW,
  ],
  [UserRoleEnum.ACCOUNTANT]: [
    APP_PERMISSIONS.EXPENSES_VIEW,
    APP_PERMISSIONS.EXPENSES_MANAGE,
    APP_PERMISSIONS.EXPENSES_DELETE,
    APP_PERMISSIONS.SALES_VIEW,
    APP_PERMISSIONS.REPORTS_VIEW,
    APP_PERMISSIONS.REPORTS_EXPORT,
  ],
  [UserRoleEnum.STAFF]: [
    APP_PERMISSIONS.SALES_VIEW,
    APP_PERMISSIONS.INVENTORY_VIEW,
  ],
};
