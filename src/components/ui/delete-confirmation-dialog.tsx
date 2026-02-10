import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string, force?: boolean) => void;
  title: string;
  description: string;
  entityName: string;
  entityType: 'company' | 'user';
  adminEmail: string;
  isLoading?: boolean;
  error?: string;
  onClearError?: () => void;
}

export const DeleteConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  entityName,
  entityType,
  adminEmail,
  isLoading = false,
  error: externalError,
  onClearError
}: DeleteConfirmationDialogProps) => {
  const [step, setStep] = useState(1);
  const [confirmationText, setConfirmationText] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [internalError, setInternalError] = useState('');
  const [forceMode, setForceMode] = useState(false);

  // Sync force mode with external error
  useEffect(() => {
    if (externalError?.includes('still logged in') || externalError?.includes('forcely')) {
      setForceMode(true);
    } else if (externalError) {
      setForceMode(false);
    }
  }, [externalError]);

  const handleClose = () => {
    setStep(1);
    setConfirmationText('');
    setPassword('');
    setInternalError('');
    setForceMode(false);
    if (onClearError) onClearError();
    onClose();
  };

  const handleNext = () => {
    if (step === 1) {
      if (confirmationText === entityName) {
        setStep(2);
        setInternalError('');
      } else {
        setInternalError(`Please type "${entityName}" to confirm`);
      }
    } else if (step === 2) {
      if (password.trim()) {
        onConfirm(password, forceMode);
      } else {
        setInternalError('Please enter your password');
      }
    }
  };

  const isStep1Valid = confirmationText === entityName;
  const isStep2Valid = password.trim().length > 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {step === 1 && (
            <div className="space-y-3">
              <Alert className="border-red-200 bg-red-50 dark:bg-red-950">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  This action cannot be undone. This will permanently delete the {entityType} and remove all associated data.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="confirmation">
                  Type <span className="font-bold text-red-600">{entityName}</span> to confirm:
                </Label>
                <Input
                  id="confirmation"
                  value={confirmationText}
                  onChange={(e) => {
                    setConfirmationText(e.target.value);
                    setInternalError('');
                    if (onClearError) onClearError();
                  }}
                  placeholder={`Type ${entityName} here`}
                  className="border-red-200 focus:border-red-500"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 dark:text-orange-200">
                  Final step: Enter your password to confirm deletion
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Enter password for <span className="font-semibold">{adminEmail}</span>:
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setInternalError('');
                      if (onClearError) onClearError();
                    }}
                    placeholder="Enter your password"
                    className="border-orange-200 focus:border-orange-500 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Internal Validation Error */}
          {internalError && (
            <Alert className="border-red-200 bg-red-50 dark:bg-red-950">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                {internalError}
              </AlertDescription>
            </Alert>
          )}

          {/* External Backend Error (e.g. Session Warning) */}
          {externalError && (
            <Alert className={`border-orange-400 bg-orange-100 dark:bg-orange-900 shadow-md ${forceMode ? 'animate-pulse' : ''}`}>
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <AlertDescription className="text-orange-900 dark:text-orange-100 font-bold">
                {externalError}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <AlertDialogFooter className="flex gap-2">
          <AlertDialogCancel onClick={handleClose} disabled={isLoading}>
            Cancel
          </AlertDialogCancel>

          {step === 1 && (
            <Button
              onClick={handleNext}
              disabled={!isStep1Valid || isLoading}
              variant="destructive"
            >
              Next Step
            </Button>
          )}

          {step === 2 && (
            <Button
              onClick={handleNext}
              disabled={!isStep2Valid || isLoading}
              variant="destructive"
              className={forceMode ? "bg-orange-600 hover:bg-orange-700 font-extrabold shadow-lg" : "bg-red-600 hover:bg-red-700"}
            >
              {isLoading ? 'Processing...' : forceMode ? 'PROCEED FORCEFULLY' : `Delete ${entityType === 'company' ? 'Company' : 'User'}`}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
