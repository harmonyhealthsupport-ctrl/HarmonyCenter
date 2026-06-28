// utils/rbac.js
import { CORE_ROLES } from '../constants';

/**
 * Check if the user is an Admin
 */
export const isAdmin = (userRole) => {
  if (!userRole) return false;
  return userRole.trim().toLowerCase() === CORE_ROLES.ADMIN.toLowerCase();
};

/**
 * Check if the user is a Head of Department (HOD)
 */
export const isHOD = (userRole) => {
  if (!userRole) return false;
  return userRole.trim().toLowerCase() === CORE_ROLES.HOD.toLowerCase();
};

/**
 * Check if the user is a regular Team member
 */
export const isTeam = (userRole) => {
  if (!userRole) return false;
  return userRole.trim().toLowerCase() === CORE_ROLES.TEAM.toLowerCase();
};

/**
 * Check if user has at least HOD privileges (Admin or HOD)
 */
export const hasManagerialAccess = (userRole) => {
  return isAdmin(userRole) || isHOD(userRole);
};