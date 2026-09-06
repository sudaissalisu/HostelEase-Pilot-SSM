// SSM Pilot — all permissions are granted (SSM_ADMIN has full access)
export function useRolePermissions() {
  return {
    canManage: (_permission: string) => true,
    isViewOnly: (_managePerm: string, _viewPerm?: string) => false,
    rolePerms: null,
  }
}
