import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentUser, logout as authLogout } from '@/lib/auth';
import UnifiedViewTables from '@/components/UnifiedViewTables';
import BackButton from '@/components/ui/BackButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAllCompanies, getPlantDetails, type PlantDetails, createResolvedTicket, getResolvedTickets, resolvePanel, type ResolvedTicket } from '@/lib/realFileSystem';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LogOut } from 'lucide-react';
import GradientHeading from '@/components/ui/GradientHeading';

// flip this to false if you want to use local mock tickets instead
const USE_TICKETS_API = true;

const TechnicianDashboard = () => {
  // if true, only loads data when the user clicks a button
  const LAZY_MODE = false;
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [user, setUser] = useState(getCurrentUser());
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [plant, setPlant] = useState<PlantDetails | null>(null);
  const [loadingDefects, setLoadingDefects] = useState(false);
  const [defectFilter, setDefectFilter] = useState<'all' | 'moderate' | 'bad' | 'resolved'>('all');
  const [resolveMode, setResolveMode] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<DefectRow | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [resolvedMeta, setResolvedMeta] = useState<Record<string, { resolvedAt: string; category: 'BAD' | 'MODERATE' }>>({});
  const [resolvedFilterCategory, setResolvedFilterCategory] = useState<'all' | 'MODERATE' | 'BAD'>('all');
  const [resolvedFilterStart, setResolvedFilterStart] = useState<string>('');
  const [resolvedFilterEnd, setResolvedFilterEnd] = useState<string>('');
  const [resolvedTickets, setResolvedTickets] = useState<ResolvedTicket[]>([]);
  const [connStatus, setConnStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');

  const checkConnection = async () => {
    try {
      await getAllCompanies();
      setConnStatus('online');
    } catch (_) {
      setConnStatus('offline');
    }
  };

  // Manual refresh hook for resolved tickets (lazy mode)
  const [resolvedRefreshKey, setResolvedRefreshKey] = useState(0);
  useEffect(() => {
    if (!USE_TICKETS_API || !companyId) return;
    if (LAZY_MODE && defectFilter !== 'resolved') return;
    (async () => {
      try {
        const tickets = await getResolvedTickets(companyId);
        const ids = new Set<string>(tickets.map(t => `${t.trackId}-${t.fault}`));
        const meta: Record<string, { resolvedAt: string; category: 'BAD' | 'MODERATE' }> = {};
        tickets.forEach(t => { meta[`${t.trackId}-${t.fault}`] = { resolvedAt: t.resolvedAt, category: t.category }; });
        setResolvedIds(ids);
        setResolvedMeta(meta);
        setResolvedTickets([...tickets].sort((a, b) => new Date(b.resolvedAt).getTime() - new Date(a.resolvedAt).getTime()));
      } catch (e) {
        console.warn('Failed to load resolved tickets', e);
      }
    })();
  }, [companyId, defectFilter, resolvedRefreshKey]);

  // Gate initial load behind lazy mode toggle
  const [dataLoaded, setDataLoaded] = useState(false);
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'technician') {
      navigate('/technician-login');
      return;
    }

    setUser(currentUser);
    setUser(currentUser);
    if (LAZY_MODE && !dataLoaded) return;

    const runLoad = async () => {
      try {
        const companies = await getAllCompanies();
        // Match by company name (legacy) or id
        const found = companies.find(c =>
          c.name?.toLowerCase() === currentUser?.companyName?.toLowerCase() ||
          c.id === currentUser?.companyId
        );

        if (found) {
          setCompanyId(found.id);
          const pd = await getPlantDetails(found.id);
          if (pd) setPlant(pd);
        }
      } catch (e) {
        console.error('Fetch error:', e);
      } finally {
        setLoadingDefects(false);
      }
    };

    setLoadingDefects(true);
    runLoad();
    const intervalId = setInterval(runLoad, 10000);
    return () => clearInterval(intervalId);
  }, [navigate, dataLoaded]);

  const handleRefresh = async () => {
    setLoadingDefects(true);
    if (!user) return;
    try {
      const companies = await getAllCompanies();
      const found = companies.find(c =>
        c.name?.toLowerCase() === user.companyName?.toLowerCase() ||
        c.id === user.companyId
      );
      if (found) {
        const pd = await getPlantDetails(found.id);
        if (pd) setPlant(pd);
      }
      setResolvedRefreshKey(k => k + 1);
    } catch (e) {
      console.error('Refresh failed:', e);
    } finally {
      setLoadingDefects(false);
    }
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
    <div className="min-h-screen flex flex-col bg-background relative">
      <div className="absolute top-4 left-4 z-10 hidden sm:block">
        <BackButton />
      </div>
      <div className="absolute top-4 right-4 z-10 hidden sm:flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs bg-card">
          <span className={
            'inline-block w-2.5 h-2.5 rounded-full ' +
            (connStatus === 'online' ? 'bg-green-500' : connStatus === 'offline' ? 'bg-red-500' : 'bg-gray-400')
          } />
          <span>{connStatus === 'online' ? 'Connected' : connStatus === 'offline' ? 'Offline' : 'Unknown'}</span>
          <Button size="sm" variant="secondary" onClick={checkConnection}>Check</Button>
        </div>
        <Button
          variant="destructive"
          onClick={() => { logout(); authLogout(); navigate('/login'); }}
        >
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
      </div>
      {/* Mobile top toolbar */}
      <div className="sm:hidden sticky top-0 z-20 bg-background/90 backdrop-blur border-b">
        <div className="px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={
                'inline-block w-2.5 h-2.5 rounded-full ' +
                (connStatus === 'online' ? 'bg-green-500' : connStatus === 'offline' ? 'bg-red-500' : 'bg-gray-400')
              }
            />
            <span className="text-xs">{connStatus === 'online' ? 'Connected' : connStatus === 'offline' ? 'Offline' : 'Unknown'}</span>
            <Button size="sm" variant="secondary" onClick={checkConnection}>Check</Button>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => { logout(); authLogout(); navigate('/login'); }}
          >
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8 flex-1 overflow-auto">
        {/* Header text above tabs */}
        <div className="mb-4">
          <GradientHeading size="lg">Solar Panel Monitoring - {user.companyName?.toLowerCase()}</GradientHeading>
          <p className="text-sm text-muted-foreground">Technician Dashboard - Real-time panel status and performance</p>
          <p className="text-xs text-muted-foreground mt-1">Role: <span className="font-semibold">Technician</span></p>
        </div>

        <Tabs defaultValue="overall" className="w-full h-full flex flex-col">
          <TabsList className="mb-6 grid grid-cols-2 gap-3 w-full bg-transparent p-0 sm:sticky sm:top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-2">
            <TabsTrigger
              value="overall"
              className="w-full h-12 text-base rounded-xl border border-gray-300 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              over all plant data
            </TabsTrigger>
            <TabsTrigger
              value="defects"
              className="w-full h-12 text-base rounded-xl border border-gray-300 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              detailed defects
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overall" className="mt-6 min-h-0 overflow-auto">
            <UnifiedViewTables
              userRole="user"
              hideHeader={true}
              companyId={companyId || undefined}
              refreshTrigger={plant?.lastUpdated || Date.now()}
            />
          </TabsContent>

          <TabsContent value="defects" className="mt-6 min-h-0 overflow-auto">
            <Card className="glass-card h-full flex flex-col">
              <CardHeader className="sticky top-0 z-10 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 flex flex-row items-center justify-between">
                <CardTitle>View All Defects</CardTitle>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loadingDefects}>
                  <svg className={`h-4 w-4 mr-2 ${loadingDefects ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Data
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {LAZY_MODE && (
                    <Button variant="secondary" onClick={() => setDataLoaded(true)}>Load/Refresh Plant</Button>
                  )}
                  <Button variant={defectFilter === 'all' && !resolveMode ? 'default' : 'outline'} onClick={() => { setResolveMode(false); setDefectFilter('all'); }}>View All</Button>
                  <Button variant={defectFilter === 'moderate' && !resolveMode ? 'default' : 'outline'} onClick={() => { setResolveMode(false); setDefectFilter('moderate'); }}>List Moderate</Button>
                  <Button variant={defectFilter === 'bad' && !resolveMode ? 'default' : 'outline'} onClick={() => { setResolveMode(false); setDefectFilter('bad'); }}>List Bad</Button>
                  <Button variant={defectFilter === 'resolved' && !resolveMode ? 'default' : 'outline'} onClick={() => { setResolveMode(false); setDefectFilter('resolved'); }}>Solved Tickets</Button>
                  {LAZY_MODE && defectFilter === 'resolved' && (
                    <Button variant="secondary" onClick={() => setResolvedRefreshKey(k => k + 1)}>Refresh Tickets</Button>
                  )}
                  <Button
                    variant={resolveMode ? 'default' : 'secondary'}
                    onClick={() => { setDefectFilter('all'); setResolveMode(true); }}
                    aria-pressed={resolveMode}
                  >
                    Resolve
                  </Button>
                </div>

                {defectFilter === 'resolved' && (
                  <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">Start Date</span>
                      <input
                        type="date"
                        value={resolvedFilterStart}
                        onChange={(e) => setResolvedFilterStart(e.target.value)}
                        className="h-9 px-3 py-1 rounded border w-full max-w-[220px]"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">End Date</span>
                      <input
                        type="date"
                        value={resolvedFilterEnd}
                        onChange={(e) => setResolvedFilterEnd(e.target.value)}
                        className="h-9 px-3 py-1 rounded border w-full max-w-[220px]"
                      />
                    </div>
                    <div className="flex items-center gap-3 sm:col-span-2">
                      <span className="text-sm font-medium">Category</span>
                      <select
                        value={resolvedFilterCategory}
                        onChange={(e) => setResolvedFilterCategory(e.target.value as 'all' | 'MODERATE' | 'BAD')}
                        className="h-9 px-3 py-1 rounded border w-full max-w-[220px]"
                      >
                        <option value="all">View All</option>
                        <option value="MODERATE">Moderate</option>
                        <option value="BAD">Bad</option>
                      </select>
                      <Button className="ml-2">OK</Button>
                    </div>
                  </div>
                )}

                {/* Desktop/tablet table (sm and up) */}
                <div className="hidden sm:block h-full">
                  <div className="h-full overflow-x-auto overflow-y-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        {defectFilter !== 'resolved' ? (
                          <tr>
                            <th className="text-left p-3">Fault</th>
                            <th className="text-left p-3">Exp. Cur</th>
                            <th className="text-left p-3">Actual Cur</th>
                            <th className="text-left p-3">Track Id</th>
                            <th className="text-left p-3">Issue Exist</th>
                            <th className="text-left p-3">Category</th>
                            <th className="text-left p-3">Power Loss</th>
                            <th className="text-left p-3">Predicted Loss (4hr)</th>
                          </tr>
                        ) : (
                          <tr>
                            <th className="text-left p-3">Fault</th>
                            <th className="text-left p-3">Track Id</th>
                            <th className="text-left p-3">Category</th>
                            <th className="text-left p-3">Power Loss (kW)</th>
                            <th className="text-left p-3">Resolved At</th>
                            <th className="text-left p-3">Resolved By</th>
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {loadingDefects && (
                          <tr><td className="p-4" colSpan={8}>Loading...</td></tr>
                        )}
                        {defectFilter !== 'resolved' && !loadingDefects && plant && filterRows(
                          getDefectRows(plant, 'all'),
                          defectFilter,
                          resolvedIds,
                          { resolvedMeta, start: resolvedFilterStart, end: resolvedFilterEnd, category: resolvedFilterCategory }
                        ).map((row) => (
                          <tr
                            key={row.key}
                            className={"border-t " + (resolveMode ? 'cursor-pointer hover:bg-muted/30' : '')}
                            onClick={() => {
                              if (!resolveMode) return;
                              setSelectedRow(row);
                              setSelectedReason('');
                              setResolveOpen(true);
                            }}
                          >
                            <td className="p-3">{row.fault}</td>
                            <td className="p-3">{row.expCur.toFixed(1)}A</td>
                            <td className="p-3"><span className={row.health < 80 ? 'text-red-600 font-semibold' : ''}>{row.actCur.toFixed(1)}A</span></td>
                            <td className="p-3">{row.trackId}</td>
                            <td className="p-3">{row.issueExist}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <img
                                  src={row.category === 'BAD' ? '/images/panels/bad.png' : row.category === 'MODERATE' ? '/images/panels/moderate.png' : '/images/panels/good.png'}
                                  alt={`${row.category.toLowerCase()} panel`}
                                  className="h-5 w-5 object-contain"
                                />
                                <Badge variant={row.category === 'BAD' ? 'destructive' : 'secondary'}>{row.category}</Badge>
                              </div>
                            </td>
                            <td className="p-3">{row.powerLoss.toFixed(1)} kW</td>
                            <td className="p-3">{row.predictedLoss.toFixed(1)}</td>
                          </tr>
                        ))}
                        {defectFilter === 'resolved' && !loadingDefects && resolvedTickets
                          // apply UI filters client-side
                          .filter(t => resolvedFilterCategory === 'all' || t.category === resolvedFilterCategory)
                          .filter(t => !resolvedFilterStart || new Date(t.resolvedAt).getTime() >= new Date(resolvedFilterStart).getTime())
                          .filter(t => !resolvedFilterEnd || new Date(t.resolvedAt).getTime() <= new Date(resolvedFilterEnd).getTime())
                          .map((t) => (
                            <tr key={`${t.trackId}-${t.fault}`} className="border-t">
                              <td className="p-3">{t.fault}</td>
                              <td className="p-3">{t.trackId}</td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={t.category === 'BAD' ? '/images/panels/bad.png' : '/images/panels/moderate.png'}
                                    alt={`${t.category.toLowerCase()} panel`}
                                    className="h-5 w-5 object-contain"
                                  />
                                  <Badge variant={t.category === 'BAD' ? 'destructive' : 'secondary'}>{t.category}</Badge>
                                </div>
                              </td>
                              <td className="p-3">{Number(t.powerLoss || 0).toFixed(3)}</td>
                              <td className="p-3">{new Date(t.resolvedAt).toLocaleString()}</td>
                              <td className="p-3">{t.resolvedBy}</td>
                            </tr>
                          ))}
                        {!loadingDefects && plant && defectFilter !== 'resolved' && filterRows(
                          getDefectRows(plant, 'all'),
                          defectFilter,
                          resolvedIds,
                          { resolvedMeta, start: resolvedFilterStart, end: resolvedFilterEnd, category: resolvedFilterCategory }
                        ).length === 0 && (
                            <tr><td className="p-4 text-muted-foreground" colSpan={8}>No defects found</td></tr>
                          )}
                        {defectFilter === 'resolved' && !loadingDefects && resolvedTickets.length === 0 && (
                          <tr><td className="p-4 text-muted-foreground" colSpan={6}>No resolved tickets found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile cards (below sm) */}
                <div className="sm:hidden space-y-3 h-full overflow-auto">
                  {loadingDefects && (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                  )}
                  {defectFilter !== 'resolved' && !loadingDefects && plant && filterRows(getDefectRows(plant, 'all'), defectFilter, resolvedIds).map((row) => (
                    <div
                      key={row.key}
                      className={"rounded-lg border p-3 bg-card " + (resolveMode ? 'cursor-pointer hover:bg-muted/30' : '')}
                      onClick={() => {
                        if (!resolveMode) return;
                        setSelectedRow(row);
                        setSelectedReason('');
                        setResolveOpen(true);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{row.fault}</div>
                        <div className="flex items-center gap-2">
                          <img
                            src={row.category === 'BAD' ? '/images/panels/bad.png' : row.category === 'MODERATE' ? '/images/panels/moderate.png' : '/images/panels/good.png'}
                            alt={`${row.category.toLowerCase()} panel`}
                            className="h-5 w-5 object-contain"
                          />
                          <Badge variant={row.category === 'BAD' ? 'destructive' : 'secondary'}>{row.category}</Badge>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="text-muted-foreground">Exp Cur</div>
                        <div>{row.expCur.toFixed(1)}A</div>
                        <div className="text-muted-foreground">Actual Cur</div>
                        <div className={row.health < 80 ? 'text-red-600 font-semibold' : ''}>{row.actCur.toFixed(1)}A</div>
                        <div className="text-muted-foreground">Track Id</div>
                        <div>{row.trackId}</div>
                        <div className="text-muted-foreground">Issue Exist</div>
                        <div>{row.issueExist}</div>
                        <div className="text-muted-foreground">Power Loss</div>
                        <div>{row.powerLoss.toFixed(1)} kW</div>
                        <div className="text-muted-foreground">Pred. Loss (4hr)</div>
                        <div>{row.predictedLoss.toFixed(1)}</div>
                      </div>
                    </div>
                  ))}
                  {defectFilter === 'resolved' && !loadingDefects && resolvedTickets.map((t) => (
                    <div key={`${t.trackId}-${t.fault}`} className="rounded-lg border p-3 bg-card">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{t.fault}</div>
                        <div className="flex items-center gap-2">
                          <img
                            src={t.category === 'BAD' ? '/images/panels/bad.png' : '/images/panels/moderate.png'}
                            alt={`${t.category.toLowerCase()} panel`}
                            className="h-5 w-5 object-contain"
                          />
                          <Badge variant={t.category === 'BAD' ? 'destructive' : 'secondary'}>{t.category}</Badge>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="text-muted-foreground">Track Id</div>
                        <div>{t.trackId}</div>
                        <div className="text-muted-foreground">Power Loss</div>
                        <div>{Number(t.powerLoss || 0).toFixed(3)} kW</div>
                        <div className="text-muted-foreground">Resolved At</div>
                        <div>{new Date(t.resolvedAt).toLocaleString()}</div>
                        <div className="text-muted-foreground">Resolved By</div>
                        <div>{t.resolvedBy}</div>
                      </div>
                    </div>
                  ))}
                  {!loadingDefects && plant && defectFilter !== 'resolved' && filterRows(
                    getDefectRows(plant, 'all'),
                    defectFilter,
                    resolvedIds,
                    { resolvedMeta, start: resolvedFilterStart, end: resolvedFilterEnd, category: resolvedFilterCategory }
                  ).length === 0 && (
                      <div className="text-sm text-muted-foreground">No defects found</div>
                    )}
                  {defectFilter === 'resolved' && !loadingDefects && resolvedTickets.length === 0 && (
                    <div className="text-sm text-muted-foreground">No resolved tickets found</div>
                  )}
                </div>

                {/* Technician role has no edit/delete controls; selection bar removed */}

                {/* Legend */}
                <div className="mt-4 flex flex-wrap items-center gap-6 border-t pt-4">
                  <div className="text-sm font-medium text-muted-foreground mr-2">Panel Status:</div>
                  <div className="flex items-center gap-2 text-xs">
                    <img src="/images/panels/good.png" className="w-5 h-5 object-contain" alt="Good" />
                    <span>Healthy (Good)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <img src="/images/panels/moderate.png" className="w-5 h-5 object-contain" alt="Moderate" />
                    <span>Moderate Defect</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <img src="/images/panels/bad.png" className="w-5 h-5 object-contain" alt="Bad" />
                    <span>Critical Fault (Bad)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={resolveOpen} onOpenChange={(open) => { setResolveOpen(open); if (!open) { setResolveMode(false); setSelectedRow(null); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Track Id: {selectedRow?.trackId} Issue Resolved?</DialogTitle>
              <DialogDescription>Select a reason and confirm to mark this issue resolved.</DialogDescription>
            </DialogHeader>
            <div className="mt-2">
              <div className="text-sm font-medium mb-2">Reason:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {['MC4 Cable Loose', 'MC4 Connector Broken', 'Panel with Dust', 'Panel with Bird Dropping', 'Panel Scratches', 'Panel Damage'].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedReason(reason)}
                    className={(selectedReason === reason ? 'bg-primary text-white ' : 'bg-muted ') + 'rounded-md px-3 py-2 text-left text-sm'}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <div className="flex w-full gap-3">
                <Button className="flex-1" onClick={async () => {
                  if (selectedRow && companyId) {
                    try {
                      // 1) Reset culprit panel values in backend first
                      let panelReset = false;
                      try {
                        // Regex to match Node-XXX.Main.P1 or TBL-XXX.TOP.P1
                        const match = selectedRow.fault.match(/^(.+)\.(.+)\.P(\d+)$/);
                        if (match) {
                          const [, serial, pos, pNum] = match;
                          const position = pos;
                          const panelIndex = Math.max(0, (parseInt(pNum || '1', 10) - 1));
                          // Find table by either new node name or old serial
                          const table = plant?.tables.find(t => (t.node === serial) || (t.serialNumber === serial));

                          if (table) {
                            const res = await resolvePanel(companyId, table.id, position, panelIndex);
                            panelReset = !!res?.success;
                            if (panelReset) {
                              const updated = await getPlantDetails(companyId);
                              if (updated) setPlant(updated);
                            }
                          }
                        }
                      } catch (e) {
                        console.warn('Failed to reset panel on resolve', e);
                      }

                      // 2) Only create resolved ticket if panel actually reset
                      if (panelReset && USE_TICKETS_API) {
                        await createResolvedTicket(companyId, {
                          trackId: selectedRow.trackId,
                          fault: selectedRow.fault,
                          reason: selectedReason || 'Other',
                          category: selectedRow.category,
                          powerLoss: selectedRow.powerLoss,
                          predictedLoss: selectedRow.predictedLoss,
                          resolvedAt: new Date().toISOString(),
                          resolvedBy: user?.email || 'technician'
                        });
                        // Refresh solved tickets list
                        try {
                          const tickets = await getResolvedTickets(companyId);
                          const ids = new Set<string>(tickets.map(t => `${t.trackId}-${t.fault}`));
                          const meta: Record<string, { resolvedAt: string; category: 'BAD' | 'MODERATE' }> = {};
                          tickets.forEach(t => { meta[`${t.trackId}-${t.fault}`] = { resolvedAt: t.resolvedAt, category: t.category }; });
                          setResolvedIds(ids);
                          setResolvedMeta(meta);
                          setResolvedTickets([...tickets].sort((a, b) => new Date(b.resolvedAt).getTime() - new Date(a.resolvedAt).getTime()));
                        } catch (e) {
                          console.warn('Failed to refresh resolved tickets after create', e);
                        }
                      }
                    } catch (e) {
                      console.error('Failed to create resolved ticket', e);
                      // do not modify resolvedIds if any step failed
                    }
                  }
                  setResolveOpen(false); setResolveMode(false);
                }}>Yes</Button>
                <Button variant="outline" className="flex-1" onClick={() => { setResolveOpen(false); }}>No</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// Helpers
type DefectRow = {
  key: string;
  fault: string;
  expCur: number;
  actCur: number;
  trackId: string;
  issueExist: string;
  category: 'BAD' | 'MODERATE';
  health: number;
  powerLoss: number; // kW
  predictedLoss: number; // kW in 4 hours
  idKey: string; // trackId-fault for backend mapping
};

function getDefectRows(plant: PlantDetails, filter: 'all' | 'moderate' | 'bad' | 'resolved'): DefectRow[] {
  const rows: DefectRow[] = [];
  const expectedCurrent = plant.currentPerPanel || 10;
  const vp = plant.voltagePerPanel || 20;
  const cp = plant.currentPerPanel || 10;
  const expectedPowerKW = (vp * cp) / 1000;

  for (const table of (plant.live_data || [])) {
    const voltages = table.panelVoltages || [];
    const actCur = table.current || 0;
    const serial = table.node || table.serialNumber || 'Node';

    voltages.forEach((actVol: number, idx: number) => {
      // Use Voltage Health to identify the actual culprit
      // Natural variation is +/- 0.2V, so anything below 19.5V is a real defect
      const voltageHealth = (actVol / vp) * 100;

      // Only show as "defect" if voltage health is significantly low
      // This prevents "Good" panels in a bottlenecked series from showing up as defects
      if (voltageHealth >= 98) return;

      const position = 'Main';
      const panelIdxInRow = idx + 1;

      // CATEGORY: Based on Voltage health
      // < 50% = BAD, else MODERATE
      const category: 'BAD' | 'MODERATE' = voltageHealth < 50 ? 'BAD' : 'MODERATE';

      const actualPowerKW = (actVol * actCur) / 1000;
      const powerLossKW = Math.max(expectedPowerKW - actualPowerKW, 0);
      const predictedLossKW = powerLossKW * 4;

      const fault = `${serial}.${position}.P${panelIdxInRow}`;
      // Track ID logic based on serial number digits + panel index
      const serialDigits = serial.match(/\d+/);
      const serNum = serialDigits ? parseInt(serialDigits[0]) : 0;
      const trackId = `${(124500 + (serNum * 100) + idx).toString()}`;

      rows.push({
        key: `${table.id || serial}-${idx}`,
        fault,
        expCur: expectedCurrent,
        actCur,
        trackId,
        issueExist: "Live",
        category,
        health: Math.round(voltageHealth), // show voltage health here
        powerLoss: Number(powerLossKW.toFixed(3)),
        predictedLoss: Number(predictedLossKW.toFixed(3)),
        idKey: `${trackId}-${fault}`,
      });
    });
  }
  return rows;
}

function filterRows(
  rows: DefectRow[],
  filter: 'all' | 'moderate' | 'bad' | 'resolved',
  resolved: Set<string>,
  opts?: { resolvedMeta: Record<string, { resolvedAt: string; category: 'BAD' | 'MODERATE' }>; start: string; end: string; category: 'all' | 'MODERATE' | 'BAD' }
): DefectRow[] {
  let filtered = rows;
  if (filter === 'moderate') filtered = rows.filter(r => r.category === 'MODERATE');
  if (filter === 'bad') filtered = rows.filter(r => r.category === 'BAD');
  if (filter === 'resolved') {
    filtered = rows.filter(r => resolved.has(r.idKey));
    if (opts) {
      const { resolvedMeta, start, end, category } = opts;
      // category filter
      if (category !== 'all') {
        filtered = filtered.filter(r => resolvedMeta[r.idKey]?.category === category);
      }
      // date range filter (inclusive)
      if (start) {
        const startTs = new Date(start).getTime();
        filtered = filtered.filter(r => {
          const ts = new Date(resolvedMeta[r.idKey]?.resolvedAt || 0).getTime();
          return ts >= startTs;
        });
      }
      if (end) {
        const endTs = new Date(end).getTime();
        filtered = filtered.filter(r => {
          const ts = new Date(resolvedMeta[r.idKey]?.resolvedAt || 0).getTime();
          return ts <= endTs;
        });
      }
    }
  }
  // Hide resolved from non-resolved views
  if (filter !== 'resolved') {
    // Only hide resolved if the panel is actually healthy now
    filtered = filtered.filter(r => !(resolved.has(r.idKey) && r.health >= 100));
  }
  return filtered;
}

export default TechnicianDashboard;