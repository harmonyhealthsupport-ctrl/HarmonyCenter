import { ROUTES } from "./routes";

export const MODULE_GROUPS = {
  CRM: "crm",
  CREATOR: "creator",
  OPERATIONS: "operations",
  MANAGEMENT: "management"
};

export const MODULES = [
  { id: "dashboard", label: "Sales Dashboard", path: ROUTES.DASHBOARD, group: MODULE_GROUPS.CRM },
  { id: "sales", label: "Sales Form", path: ROUTES.SALES_FORM, group: MODULE_GROUPS.CRM },
  { id: "customers", label: "Customer Database", path: ROUTES.CUSTOMERS, group: MODULE_GROUPS.CRM },
  
  { id: "content-stats", label: "Analytics Dashboard", path: ROUTES.CREATOR_DASHBOARD, group: MODULE_GROUPS.CREATOR },
  { id: "creator-daily", label: "Daily Achievement", path: ROUTES.CREATOR_DAILY, group: MODULE_GROUPS.CREATOR },
  { id: "creator-library", label: "Data Library", path: ROUTES.CREATOR_LIBRARY, group: MODULE_GROUPS.CREATOR },
  
  { id: "leads", label: "Leads Management", path: ROUTES.LEADS, group: MODULE_GROUPS.OPERATIONS },
  { id: "inventory", label: "Inventory System", path: ROUTES.INVENTORY, group: MODULE_GROUPS.OPERATIONS },
  
  { id: "hr", label: "HR & Payroll", path: ROUTES.HR, group: MODULE_GROUPS.MANAGEMENT },
  { id: "tasks", label: "Task Manager", path: ROUTES.TASKS, group: MODULE_GROUPS.MANAGEMENT },
  { id: "account", label: "My Account", path: ROUTES.ACCOUNT, group: MODULE_GROUPS.MANAGEMENT },
  { id: "settings", label: "System Admin", path: ROUTES.SETTINGS, group: MODULE_GROUPS.MANAGEMENT }
];