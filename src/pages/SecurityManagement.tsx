import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Shield, UserCheck, UserX, Lock, Unlock, Mail, Phone, Clock } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { updateStaffStatus, getStaffEntries } from '@/lib/realFileSystem';
import { useToast } from '@/hooks/use-toast';
import BackButton from '@/components/ui/BackButton';
import GradientHeading from '@/components/ui/GradientHeading';

interface AccountEntry {
    id: string;
    name: string;
    role: string;
    email: string;
    phoneNumber: string;
    status: 'active' | 'blocked' | 'offline';
    failedLoginAttempts?: number;
    lastLogin?: string;
}

const SecurityManagement = () => {
    const { toast } = useToast();
    const [user] = useState(getCurrentUser());
    const [entries, setEntries] = useState<AccountEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const fetchStaff = async (isInitial = false) => {
        if (!user?.companyId) return;
        try {
            if (isInitial) setLoading(true);
            const data = await getStaffEntries(user.companyId);
            // Filter out current user from display (Admins shouldn't manage themselves)
            const filteredData = Array.isArray(data) ? data.filter((e: any) => e.email !== user.email) : [];
            setEntries(filteredData);
        } catch (error) {
            console.error('Error fetching staff for security:', error);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff(true); // Load initially
        // Auto-refresh status every 10 seconds for real-time feel
        const interval = setInterval(() => fetchStaff(false), 10000);
        return () => clearInterval(interval);
    }, [user?.companyId]);

    const handleUnblock = async (entry: AccountEntry) => {
        if (!user?.companyId) return;

        try {
            setIsUpdating(entry.id);
            // Explicitly set to 'active' (unblock), no toggle.
            await updateStaffStatus(user.companyId, entry.id, 'active');

            toast({
                title: 'Account Unblocked',
                description: `${entry.name}'s account has been successfully verified and unblocked.`,
            });

            // Update local state immediately for better UX
            setEntries(prev => prev.map(e =>
                e.id === entry.id ? { ...e, status: 'active', failedLoginAttempts: 0 } : e
            ));
        } catch (error) {
            console.error('Error unblocking account:', error);
            toast({
                title: 'Unblock Failed',
                description: 'Failed to unblock account. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsUpdating(null);
        }
    };

    const blockedUsers = entries.filter(e => e.status === 'blocked');
    const onlineUsers = entries.filter(e => e.status === 'active');
    const offlineUsers = entries.filter(e => e.status === 'offline');

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground font-medium">Loading security status...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <GradientHeading size="md">Security & Access Control</GradientHeading>
                    <p className="text-muted-foreground mt-1">Manage user account status and login permissions.</p>
                </div>
                <div className="flex gap-4">
                    <Badge variant="outline" className="px-3 py-1 border-red-200 bg-red-50 text-red-700 flex gap-2 items-center">
                        <UserX className="h-4 w-4" />
                        {blockedUsers.length} Blocked
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1 border-green-200 bg-green-50 text-green-700 flex gap-2 items-center">
                        <CheckCircle className="h-4 w-4" />
                        {onlineUsers.length} Online
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1 border-gray-200 bg-gray-50 text-gray-700 flex gap-2 items-center">
                        <Clock className="h-4 w-4" />
                        {offlineUsers.length} Offline
                    </Badge>
                </div>
            </div>

            {blockedUsers.length > 0 && (
                <Card className="border-red-200 bg-red-50/30 overflow-hidden shadow-md">
                    <CardHeader className="bg-red-100/50 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500 rounded-lg shadow-lg shadow-red-500/20">
                                <AlertTriangle className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-red-900">Blocked Accounts Requiring Action</CardTitle>
                                <CardDescription className="text-red-700">Accounts blocked due to repeated failed login attempts or manual policy.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-red-200">
                            {blockedUsers.map((entry) => (
                                <div key={entry.id} className="p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-red-100/30 transition-colors">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-900 text-lg">{entry.name}</span>
                                            <Badge className="bg-red-600 text-white border-none text-[10px] uppercase font-bold px-2 py-0">Blocked</Badge>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-3 w-3" />
                                                {entry.email}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-3 w-3" />
                                                {entry.phoneNumber}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Lock className="h-3 w-3" />
                                                Role: <span className="capitalize font-medium">{entry.role}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-red-600 font-medium">
                                                <Clock className="h-3 w-3" />
                                                Failed Attempts: {entry.failedLoginAttempts || 0}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="default"
                                        className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-6 shadow-lg shadow-green-600/20 w-full md:w-auto"
                                        onClick={() => handleUnblock(entry)}
                                        disabled={isUpdating === entry.id}
                                    >
                                        {isUpdating === entry.id ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        ) : (
                                            <Unlock className="mr-2 h-5 w-5" />
                                        )}
                                        Verify & Unblock
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {blockedUsers.length === 0 && (
                <Card className="border-green-100 bg-green-50/20 shadow-sm border-dashed">
                    <CardContent className="py-12 flex flex-col items-center text-center">
                        <div className="p-4 bg-green-100 rounded-full mb-4">
                            <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-green-900">System Secure</h3>
                        <p className="text-green-700 mt-2 max-w-sm">No accounts are currently blocked. All users have active access to the system.</p>
                    </CardContent>
                </Card>
            )}

            <Card className="card-modern shadow-lg border-gray-200/50">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary rounded-lg shadow-lg shadow-primary/20">
                            <Shield className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">All User Access Control</CardTitle>
                            <CardDescription>Review and manage access for all company personnel.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-y border-gray-100">
                                    <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {entries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-primary/5 transition-colors">
                                        <td className="p-4">
                                            <div className="font-semibold text-gray-900">{entry.name}</div>
                                            <div className="text-xs text-gray-500">{entry.email}</div>
                                        </td>
                                        <td className="p-4">
                                            <Badge variant="outline" className="capitalize text-[10px]">{entry.role}</Badge>
                                        </td>
                                        <td className="p-4">
                                            {entry.status === 'active' ? (
                                                <Badge className="bg-green-100 text-green-700 border-none text-[10px]">Active</Badge>
                                            ) : entry.status === 'offline' ? (
                                                <Badge className="bg-gray-100 text-gray-500 border-none text-[10px]">Offline</Badge>
                                            ) : (
                                                <Badge variant="destructive" className="text-[10px]">Blocked</Badge>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            {entry.status === 'blocked' && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="text-green-600 hover:text-green-700 hover:bg-green-50 font-semibold"
                                                    onClick={() => handleUnblock(entry)}
                                                    disabled={isUpdating === entry.id}
                                                >
                                                    {isUpdating === entry.id ? (
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                                                    ) : (
                                                        <><Unlock className="h-4 w-4 mr-2" /> Unblock</>
                                                    )}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SecurityManagement;
