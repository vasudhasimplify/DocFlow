/**
 * Debug component to display current user ID
 * Shows in development mode only
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function UserIdDebug() {
  const [userId, setUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUserId();
  }, []);

  const copyToClipboard = () => {
    if (userId) {
      navigator.clipboard.writeText(userId);
      setCopied(true);
      toast({
        title: "User ID copied!",
        description: "You can now use this ID for API testing",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Only show in development
  if (import.meta.env.PROD) return null;
  if (!userId) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-slate-900 text-white p-3 rounded-lg shadow-lg max-w-md z-50 border border-slate-700">
      <div className="text-xs font-semibold mb-1 text-slate-300">
        🔧 Development Mode - Your User ID:
      </div>
      <div className="flex items-center gap-2">
        <code className="text-xs bg-slate-800 px-2 py-1 rounded flex-1 truncate">
          {userId}
        </code>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="h-7 w-7 p-0"
          title="Copy User ID"
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-400" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </Button>
      </div>
      <div className="text-[10px] text-slate-400 mt-1">
        Use this ID for backend API testing
      </div>
    </div>
  );
}
