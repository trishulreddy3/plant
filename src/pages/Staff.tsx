import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users } from 'lucide-react';
import ExistingStaffMembers from './ExistingStaffMembers';
import AddStaff from './AddStaff';
import GradientHeading from '@/components/ui/GradientHeading';

const Staff = () => {
  const [tab, setTab] = useState('list');
  const navigate = useNavigate();
  const location = useLocation();
  const isEmbedded = location.pathname.startsWith('/plant-admin-dashboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {!isEmbedded && (
        <header className="glass-header sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/plant-admin-dashboard')}
              className="mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <GradientHeading size="md">Staff Management</GradientHeading>
            </div>
          </div>
        </header>
      )}

      <main className="container mx-auto px-4 py-8">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Manage your team</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="mb-6 grid grid-cols-2 gap-3 w-full bg-transparent p-0">
                <TabsTrigger
                  value="list"
                  className="w-full h-12 text-base rounded-xl border border-gray-300 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  Existing Staff
                </TabsTrigger>
                <TabsTrigger
                  value="add"
                  className="w-full h-12 text-base rounded-xl border border-gray-300 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  Add Staff
                </TabsTrigger>
              </TabsList>
              <TabsContent value="list" className="mt-0">
                <ExistingStaffMembers embedded onAddStaff={() => setTab('add')} />
              </TabsContent>
              <TabsContent value="add" className="mt-0">
                <AddStaff embedded onBack={() => setTab('list')} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Staff;
