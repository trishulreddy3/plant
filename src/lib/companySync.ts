// Company synchronization utilities
// Ensures frontend company IDs match backend company folders

import { getAllCompanies } from './realFileSystem';
import { getCurrentUser, setCurrentUser, type User } from './auth';

export const syncUserCompanyId = async (): Promise<boolean> => {
  try {
    const user = getCurrentUser();
    if (!user || !user.companyId) {
      return false;
    }

    // Get companies from backend
    const backendCompanies = await getAllCompanies();
    
    // Check if user's company exists in backend
    const companyExists = backendCompanies.some(company => company.id === user.companyId);
    
    if (!companyExists && backendCompanies.length > 0) {
      // If user's company doesn't exist but there are companies in backend,
      // update user to use the first available company
      const firstCompany = backendCompanies[0];
      
      const updatedUser: User = {
        ...user,
        companyId: firstCompany.id,
        companyName: firstCompany.name,
      };
      
      setCurrentUser(updatedUser);
      console.log(`Updated user company ID from ${user.companyId} to ${firstCompany.id}`);
      return true;
    }
    
    return companyExists;
  } catch (error) {
    console.error('Error syncing user company ID:', error);
    return false;
  }
};

export const validateUserCompany = async (): Promise<{ isValid: boolean; message?: string }> => {
  try {
    const user = getCurrentUser();
    if (!user || !user.companyId) {
      return { isValid: false, message: 'User not authenticated' };
    }

    const backendCompanies = await getAllCompanies();
    const companyExists = backendCompanies.some(company => company.id === user.companyId);
    
    if (!companyExists) {
      if (backendCompanies.length === 0) {
        return { isValid: false, message: 'No companies exist in the backend system' };
      } else {
        return { isValid: false, message: `Company ${user.companyId} not found in backend. Available companies: ${backendCompanies.map(c => c.id).join(', ')}` };
      }
    }
    
    return { isValid: true };
  } catch (error) {
    console.error('Error validating user company:', error);
    return { isValid: false, message: 'Failed to validate company' };
  }
};
