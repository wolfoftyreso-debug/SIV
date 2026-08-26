export type TenantRole =
  | "tenant_owner"
  | "case_admin"
  | "case_manager"
  | "hr_manager"
  | "legal_reviewer"
  | "external_counsel"
  | "auditor"
  | "viewer";

export type Permission =
  | "employment_cases.read"
  | "employment_cases.write"
  | "employment_cases.admin"
  | "employment_cases.audit.read"
  | "employment_cases.legal.review";

const rolePermissions: Record<TenantRole, Permission[]> = {
  tenant_owner: ["employment_cases.read", "employment_cases.write", "employment_cases.admin", "employment_cases.audit.read"],
  case_admin: ["employment_cases.read", "employment_cases.write", "employment_cases.admin", "employment_cases.audit.read"],
  case_manager: ["employment_cases.read", "employment_cases.write"],
  hr_manager: ["employment_cases.read", "employment_cases.write"],
  legal_reviewer: ["employment_cases.read", "employment_cases.legal.review"],
  external_counsel: ["employment_cases.read"],
  auditor: ["employment_cases.read", "employment_cases.audit.read"],
  viewer: ["employment_cases.read"],
};

export function hasPermission(roles: string[], required: Permission): boolean {
  for (const role of roles) {
    const r = role.trim() as TenantRole;
    const perms = rolePermissions[r];
    if (perms?.includes(required)) return true;
  }
  return false;
}

