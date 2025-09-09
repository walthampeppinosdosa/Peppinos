/**
 * Role definitions and permissions
 */
const ROLES = {
  SUPER_ADMIN: 'super-admin',
  VEG_ADMIN: 'veg-admin',
  NON_VEG_ADMIN: 'non-veg-admin',
  CUSTOMER: 'customer'
};

const PERMISSIONS = {
  // Menu permissions
  VIEW_ALL_MENU_ITEMS: 'view_all_menu_items',
  CREATE_VEG_MENU_ITEMS: 'create_veg_menu_items',
  CREATE_NON_VEG_MENU_ITEMS: 'create_non_veg_menu_items',
  UPDATE_VEG_MENU_ITEMS: 'update_veg_menu_items',
  UPDATE_NON_VEG_MENU_ITEMS: 'update_non_veg_menu_items',
  DELETE_VEG_MENU_ITEMS: 'delete_veg_menu_items',
  DELETE_NON_VEG_MENU_ITEMS: 'delete_non_veg_menu_items',
  
  // Category permissions
  VIEW_ALL_CATEGORIES: 'view_all_categories',
  CREATE_VEG_CATEGORIES: 'create_veg_categories',
  CREATE_NON_VEG_CATEGORIES: 'create_non_veg_categories',
  UPDATE_VEG_CATEGORIES: 'update_veg_categories',
  UPDATE_NON_VEG_CATEGORIES: 'update_non_veg_categories',
  DELETE_VEG_CATEGORIES: 'delete_veg_categories',
  DELETE_NON_VEG_CATEGORIES: 'delete_non_veg_categories',
  
  // Order permissions
  VIEW_ALL_ORDERS: 'view_all_orders',
  UPDATE_ORDER_STATUS: 'update_order_status',
  
  // User permissions
  VIEW_ALL_USERS: 'view_all_users',
  UPDATE_USER_ROLES: 'update_user_roles',
  
  // Review permissions
  MODERATE_REVIEWS: 'moderate_reviews',
  
  // Analytics permissions
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_REPORTS: 'export_reports'
};

/**
 * Role-permission mapping
 */
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    // View permissions
    PERMISSIONS.VIEW_ALL_MENU_ITEMS,
    PERMISSIONS.VIEW_ALL_CATEGORIES,
    PERMISSIONS.VIEW_ALL_ORDERS,
    PERMISSIONS.VIEW_ALL_USERS,
    // Write permissions for menu items
    PERMISSIONS.CREATE_VEG_MENU_ITEMS,
    PERMISSIONS.CREATE_NON_VEG_MENU_ITEMS,
    PERMISSIONS.UPDATE_VEG_MENU_ITEMS,
    PERMISSIONS.UPDATE_NON_VEG_MENU_ITEMS,
    PERMISSIONS.DELETE_VEG_MENU_ITEMS,
    PERMISSIONS.DELETE_NON_VEG_MENU_ITEMS,
    // Write permissions for categories
    PERMISSIONS.CREATE_VEG_CATEGORIES,
    PERMISSIONS.CREATE_NON_VEG_CATEGORIES,
    PERMISSIONS.UPDATE_VEG_CATEGORIES,
    PERMISSIONS.UPDATE_NON_VEG_CATEGORIES,
    PERMISSIONS.DELETE_VEG_CATEGORIES,
    PERMISSIONS.DELETE_NON_VEG_CATEGORIES,
    // Order permissions
    PERMISSIONS.UPDATE_ORDER_STATUS,
    // Other permissions
    PERMISSIONS.UPDATE_USER_ROLES,
    PERMISSIONS.MODERATE_REVIEWS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.EXPORT_REPORTS
  ],

  [ROLES.VEG_ADMIN]: [
    PERMISSIONS.VIEW_ALL_MENU_ITEMS,
    PERMISSIONS.CREATE_VEG_MENU_ITEMS,
    PERMISSIONS.UPDATE_VEG_MENU_ITEMS,
    PERMISSIONS.DELETE_VEG_MENU_ITEMS,
    PERMISSIONS.VIEW_ALL_CATEGORIES,
    PERMISSIONS.CREATE_VEG_CATEGORIES,
    PERMISSIONS.UPDATE_VEG_CATEGORIES,
    PERMISSIONS.DELETE_VEG_CATEGORIES,
    PERMISSIONS.VIEW_ALL_ORDERS,
    PERMISSIONS.UPDATE_ORDER_STATUS,
    PERMISSIONS.MODERATE_REVIEWS,
    PERMISSIONS.VIEW_ANALYTICS
  ],
  
  [ROLES.NON_VEG_ADMIN]: [
    PERMISSIONS.VIEW_ALL_MENU_ITEMS,
    PERMISSIONS.CREATE_NON_VEG_MENU_ITEMS,
    PERMISSIONS.UPDATE_NON_VEG_MENU_ITEMS,
    PERMISSIONS.DELETE_NON_VEG_MENU_ITEMS,
    PERMISSIONS.VIEW_ALL_CATEGORIES,
    PERMISSIONS.CREATE_NON_VEG_CATEGORIES,
    PERMISSIONS.UPDATE_NON_VEG_CATEGORIES,
    PERMISSIONS.DELETE_NON_VEG_CATEGORIES,
    PERMISSIONS.VIEW_ALL_ORDERS,
    PERMISSIONS.UPDATE_ORDER_STATUS,
    PERMISSIONS.MODERATE_REVIEWS,
    PERMISSIONS.VIEW_ANALYTICS
  ],
  
  [ROLES.CUSTOMER]: [
    // Customers have no admin permissions
  ]
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean} - Whether the role has the permission
 */
const hasPermission = (role, permission) => {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  return rolePermissions.includes(permission);
};

/**
 * Check if user can access vegetarian resources
 * @param {string} role - User role
 * @returns {boolean} - Whether user can access veg resources
 */
const canAccessVegResources = (role) => {
  return role === ROLES.SUPER_ADMIN || role === ROLES.VEG_ADMIN;
};

/**
 * Check if user can access non-vegetarian resources
 * @param {string} role - User role
 * @returns {boolean} - Whether user can access non-veg resources
 */
const canAccessNonVegResources = (role) => {
  return role === ROLES.SUPER_ADMIN || role === ROLES.NON_VEG_ADMIN;
};

/**
 * Check if user can modify resources (not read-only)
 * @param {string} role - User role
 * @returns {boolean} - Whether user can modify resources
 */
const canModifyResources = (role) => {
  return role !== ROLES.SUPER_ADMIN && role !== ROLES.CUSTOMER;
};

/**
 * Get filter for menu items/categories based on user role
 * @param {string} role - User role
 * @returns {Object} - MongoDB filter object
 */
const getRoleBasedFilter = (role) => {
  switch (role) {
    case ROLES.VEG_ADMIN:
      return { isVegetarian: true };
    case ROLES.NON_VEG_ADMIN:
      return { isVegetarian: false };
    case ROLES.SUPER_ADMIN:
    case ROLES.CUSTOMER:
    default:
      return {}; // No filter, can see all
  }
};

/**
 * Check if user can perform action on specific resource type
 * @param {string} role - User role
 * @param {string} action - Action to perform (create, update, delete)
 * @param {boolean} isVegetarian - Whether the resource is vegetarian
 * @returns {boolean} - Whether action is allowed
 */
const canPerformAction = (role, action, isVegetarian) => {
  // Super admin has full access to all resources
  if (role === ROLES.SUPER_ADMIN) {
    return true;
  }
  
  // Customers can't perform admin actions
  if (role === ROLES.CUSTOMER) {
    return false;
  }
  
  // Veg admin can only manage vegetarian resources
  if (role === ROLES.VEG_ADMIN) {
    return isVegetarian;
  }
  
  // Non-veg admin can only manage non-vegetarian resources
  if (role === ROLES.NON_VEG_ADMIN) {
    return !isVegetarian;
  }
  
  return false;
};

/**
 * Get user role display name
 * @param {string} role - User role
 * @returns {string} - Display name for the role
 */
const getRoleDisplayName = (role) => {
  const displayNames = {
    [ROLES.SUPER_ADMIN]: 'Super Administrator',
    [ROLES.VEG_ADMIN]: 'Vegetarian Admin',
    [ROLES.NON_VEG_ADMIN]: 'Non-Vegetarian Admin',
    [ROLES.CUSTOMER]: 'Customer'
  };
  
  return displayNames[role] || 'Unknown Role';
};

/**
 * Get all available roles
 * @returns {Array} - Array of role objects
 */
const getAllRoles = () => {
  return Object.values(ROLES).map(role => ({
    value: role,
    label: getRoleDisplayName(role),
    permissions: ROLE_PERMISSIONS[role] || []
  }));
};

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  canAccessVegResources,
  canAccessNonVegResources,
  canModifyResources,
  getRoleBasedFilter,
  canPerformAction,
  getRoleDisplayName,
  getAllRoles
};
