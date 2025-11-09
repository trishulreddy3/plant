/**
 * Route constants for the application
 * Centralized route definitions for better maintainability
 */

export const ROUTE_PATHS = {
  // Public routes
  HOME: '/',
  LOGIN: '/',
  
  // Protected routes
  DASHBOARD: '/dashboard',
  
  // Future routes (for expansion)
  PROFILE: '/profile',
  SETTINGS: '/settings',
  HELP: '/help',
  
  // Error routes
  NOT_FOUND: '/404',
  UNAUTHORIZED: '/unauthorized',
  SERVER_ERROR: '/500'
} as const;

export const ROUTE_NAMES = {
  HOME: 'Home',
  LOGIN: 'Login',
  DASHBOARD: 'Dashboard',
  PROFILE: 'Profile',
  SETTINGS: 'Settings',
  HELP: 'Help',
  NOT_FOUND: 'Page Not Found',
  UNAUTHORIZED: 'Unauthorized',
  SERVER_ERROR: 'Server Error'
} as const;

// Route metadata for SEO and navigation
export const ROUTE_META = {
  [ROUTE_PATHS.HOME]: {
    title: 'PM Solar Plant Monitor - Login',
    description: 'Login to PM Solar Plant Monitoring System',
    requireAuth: false
  },
  [ROUTE_PATHS.DASHBOARD]: {
    title: 'Dashboard - PM Solar Plant Monitor',
    description: 'Solar plant monitoring dashboard',
    requireAuth: true
  }
} as const;

export type RoutePath = typeof ROUTE_PATHS[keyof typeof ROUTE_PATHS];
export type RouteName = typeof ROUTE_NAMES[keyof typeof ROUTE_NAMES];
