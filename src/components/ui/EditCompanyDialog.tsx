import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updatePlantSettings } from "@/lib/realFileSystem";

export function EditCompanyDialog({ company, onUpdate }: { company: any, onUpdate: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Form States
    const [power, setPower] = useState(company?.plantPowerKW || 0);
    const [voltage, setVoltage] = useState(company?.panelVoltage || 20);
    const [current, setCurrent] = useState(company?.panelCurrent || 10);

    // Sync state when company prop changes
    useEffect(() => {
        if (company) {
            setPower(company.plantPowerKW || 0);
            setVoltage(company.panelVoltage || 20);
            setCurrent(company.panelCurrent || 10);
        }
    }, [company]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await updatePlantSettings(company.id, Number(voltage), Number(current), Number(power));

            toast({
                title: "Updated Successfully",
                description: "Company plant settings have been updated.",
            });
            onUpdate();
            setOpen(false);
        } catch (error) {
            console.error(error);
            toast({
                title: "Update Failed",
                description: "Failed to update settings.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Details
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Company Settings</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="power" className="text-right">
                            Plant Power (kW)
                        </Label>
                        <Input
                            id="power"
                            type="number"
                            value={power}
                            onChange={(e) => setPower(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="voltage" className="text-right">
                            Voltage / Panel (V)
                        </Label>
                        <Input
                            id="voltage"
                            type="number"
                            value={voltage}
                            onChange={(e) => setVoltage(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="current" className="text-right">
                            Current / Panel (A)
                        </Label>
                        <Input
                            id="current"
                            type="number"
                            value={current}
                            onChange={(e) => setCurrent(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
