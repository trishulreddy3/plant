import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser } from '@/lib/auth';
import UnifiedViewTables from '@/components/UnifiedViewTables';
import BackButton from '@/components/ui/BackButton';

const PlantView = () => {
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId: string }>();
  const [user] = useState(getCurrentUser());

  useEffect(() => {
    if (!user || user.role !== 'super_admin') {
      navigate('/admin-login');
      return;
    }

    if (!companyId) {
      navigate('/super-admin-dashboard');
      return;
    }
  }, [user, navigate, companyId]);

  const handleBackClick = () => {
    navigate(`/company-monitor/${companyId}`);
  };

  if (!user || !companyId) {
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
        userRole="super_admin"
        companyId={companyId}
        showBackButton={true}
        backButtonText="Back to Company Monitor"
        onBackClick={handleBackClick}
      />
    </div>
  );
};

export default PlantView;