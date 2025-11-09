import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  title: string;
  itemName: string;
  itemType: 'company' | 'user';
  confirmationText: string;
  passwordLabel: string;
  warningMessage: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType,
  confirmationText,
  passwordLabel,
  warningMessage
}) => {
  const [step, setStep] = useState(1);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleClose = () => {
    setStep(1);
    setConfirmationInput('');
    setPassword('');
    setError('');
    onClose();
  };

  const handleStep1Continue = () => {
    if (confirmationInput === confirmationText) {
      setStep(2);
      setError('');
    } else {
      setError(`Please type "${confirmationText}" to confirm`);
    }
  };

  const handleFinalDelete = () => {
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    
    onConfirm(password);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white p-6 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-2">⚠️ Warning</p>
              <p className="text-sm text-red-700">{warningMessage}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmation" className="text-sm font-medium">
                Please type <span className="font-mono bg-gray-100 px-1 rounded">{confirmationText}</span> to confirm:
              </Label>
              <Input
                id="confirmation"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder={confirmationText}
                className="font-mono"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStep1Continue}
                variant="destructive"
                className="flex-1"
                disabled={!confirmationInput.trim()}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-2">🔐 Final Confirmation</p>
              <p className="text-sm text-red-700">
                Enter your {passwordLabel.toLowerCase()} to permanently delete <strong>{itemName}</strong>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                {passwordLabel}:
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                onKeyPress={(e) => e.key === 'Enter' && handleFinalDelete()}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleFinalDelete}
                variant="destructive"
                className="flex-1"
                disabled={!password.trim()}
              >
                Delete {itemType === 'company' ? 'Company' : 'User'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default DeleteConfirmationModal;
