import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/auth';
import UnifiedViewTables from '@/components/UnifiedViewTables';
import BackButton from '@/components/ui/BackButton';

const PlantMonitor = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'plant_admin') {
      navigate('/admin-login');
      return;
    }
    
    setUser(currentUser);
  }, [navigate]);

  const handleBackClick = () => {
    navigate('/plant-admin-dashboard');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-primary">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <UnifiedViewTables
        userRole="plant_admin"
        showBackButton={true}
        backButtonText="Back to Dashboard"
        onBackClick={handleBackClick}
      />
    </div>
  );
};

export default PlantMonitor;
