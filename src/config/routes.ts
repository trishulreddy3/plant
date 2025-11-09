import { UserRole } from '@/contexts/AuthContext';

export interface RouteConfig {
  path: string;
  name: string;
  requireAuth: boolean;
  allowedRoles?: UserRole[];
  redirectTo?: string;
  description?: string;
}

export const ROUTES: Record<string, RouteConfig> = {
  // Public routes
  LOGIN: {
    path: '/',
    name: 'Login',
    requireAuth: false,
    description: 'Login page for all user types'
  },

  // Protected routes
  DASHBOARD: {
    path: '/dashboard',
    name: 'Dashboard',
    requireAuth: true,
    description: 'Main dashboard - role-based content'
  },

  // Super Admin specific routes (if we add more in future)
  SUPER_ADMIN_DASHBOARD: {
    path: '/dashboard',
    name: 'Super Admin Dashboard',
    requireAuth: true,
    allowedRoles: ['superadmin'],
    description: 'Super Admin management dashboard'
  },

  // Plant Admin specific routes
  PLANT_ADMIN_DASHBOARD: {
    path: '/dashboard',
    name: 'Plant Admin Dashboard',
    requireAuth: true,
    allowedRoles: ['plantadmin'],
    description: 'Plant Admin management dashboard'
  },

  // User specific routes
  USER_DASHBOARD: {
    path: '/dashboard',
    name: 'User Dashboard',
    requireAuth: true,
    allowedRoles: ['user'],
    description: 'User monitoring dashboard'
  },

  // Error routes
  NOT_FOUND: {
    path: '*',
    name: 'Not Found',
    requireAuth: false,
    description: '404 error page'
  }
};

export const getRouteConfig = (path: string): RouteConfig | undefined => {
  return Object.values(ROUTES).find(route => route.path === path);
};

export const isRouteAllowed = (path: string, userRole?: UserRole): boolean => {
  const route = getRouteConfig(path);
  if (!route) return false;

  if (!route.requireAuth) return true;
  if (!userRole) return false;
  if (!route.allowedRoles || route.allowedRoles.length === 0) return true;

  return route.allowedRoles.includes(userRole);
};

export const getDefaultRouteForRole = (role: UserRole): string => {
  switch (role) {
    case 'superadmin':
    case 'plantadmin':
    case 'technician':
      return ROUTES.DASHBOARD.path;
    default:
      return ROUTES.LOGIN.path;
  }
};

export const getRedirectRoute = (userRole?: UserRole): string => {
  if (!userRole) return ROUTES.LOGIN.path;
  return getDefaultRouteForRole(userRole);
};
