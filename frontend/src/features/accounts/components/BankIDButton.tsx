import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/shared/components/ui/Button';
import {
useBankIDInitiate,
useBankIDCollect,
useBankIDCancel,
type BankIDInitiateResponse,
} from '@/features/accounts/api/bankid';
type BankIDStatus = 'idle' | 'initializing' | 'pending' | 'complete' | 'failed';
interface BankIDButtonProps {
className?: string;
onSuccess?: () => void;
}
export const BankIDButton: React.FC<BankIDButtonProps> = ({
className = '',
onSuccess,
}) => {
const navigate = useNavigate();
const [status, setStatus] = useState<BankIDStatus>('idle');
const [message, setMessage] = useState('');
const [sessionData, setSessionData] = useState<BankIDInitiateResponse | null>(null);
const initiateMutation = useBankIDInitiate();
const collectMutation = useBankIDCollect();
const cancelMutation = useBankIDCancel();
/**

Step 1: Start BankID authentication
*/
const handleInitiate = useCallback(async () => {
try {
setStatus('initializing');
setMessage('Connecting to BankID...');
const data = await initiateMutation.mutateAsync({});
setSessionData(data);
setStatus('pending');
setMessage('Open your BankID app...');
// Launch BankID app on mobile
if (data.autoStartToken) {
const bankIdUrl = bankid:///?autostarttoken=${data.autoStartToken}&redirect=null;
window.location.href = bankIdUrl;
}

} catch (error) {
    setStatus('failed');
    setMessage('Failed to start BankID');
}
}, [initiateMutation]);
/**

Step 2: Poll for completion every 2 seconds
*/
useEffect(() => {
if (status !== 'pending' || !sessionData) return;

const pollInterval = setInterval(async () => {
    try {
        const result = await collectMutation.mutateAsync();

        if (result.status === 'complete') {
            setStatus('complete');
            setMessage('Authentication successful! ✓');
            clearInterval(pollInterval);

            // Redirect to dashboard after brief delay
            setTimeout(() => {
                if (onSuccess) {
                    onSuccess();
                } else {
                    void navigate({ to: '/dashboard' });
                }
            }, 1500);

        } else if (result.status === 'failed') {
            setStatus('failed');
            setMessage('Authentication failed');
            clearInterval(pollInterval);

        } else if (result.status === 'pending') {
            setMessage(result.message || 'Processing...');
        }

    } catch (error) {
        setStatus('failed');
        setMessage('Authentication error');
        clearInterval(pollInterval);
    }
}, 2000); // Poll every 2 seconds

// Cleanup on unmount
return () => clearInterval(pollInterval);
}, [status, sessionData, collectMutation, navigate, onSuccess]);
/**

Cancel authentication
*/
const handleCancel = useCallback(async () => {
try {
await cancelMutation.mutateAsync();
} catch (error) {
// Ignore cancel errors
}

setStatus('idle');
setMessage('');
setSessionData(null);
}, [cancelMutation]);
return (
<div className={space-y-4 ${className}}>
{/* Main BankID Button */}
<Button
onClick={handleInitiate}
disabled={status !== 'idle'}
loading={status === 'initializing' || status === 'pending'}
className="w-full"
type="button"
>
{status === 'initializing' || status === 'pending' ? (
<span className="flex items-center justify-center gap-2">
<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
{message}
</span>
) : (
<span className="flex items-center justify-center gap-2">
<span className="text-lg">🇸🇪</span>
Login with BankID
</span>
)}
</Button>
    {/* Cancel Button (only shown during pending) */}
    {status === 'pending' && (
        <Button
            variant="ghost"
            onClick={handleCancel}
            className="w-full"
            type="button"
        >
            Cancel
        </Button>
    )}

    {/* Success Message */}
    {status === 'complete' && (
        <div className="text-center p-3 bg-success-50 text-success-700 rounded-nordic-lg">
            <span className="font-medium">✓ {message}</span>
        </div>
    )}

    {/* Error Message */}
    {status === 'failed' && (
        <div className="text-center p-3 bg-error-50 text-error-700 rounded-nordic-lg">
            <span className="font-medium">✗ {message}</span>
        </div>
    )}
</div>
);
