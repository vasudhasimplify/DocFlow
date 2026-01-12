import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

/**
 * Redirect component for old approval email URLs
 * Converts /shared/{share_link_id} to /s/{token}
 */
export default function SharedLinkRedirect() {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTokenAndRedirect = async () => {
      if (!shareId) {
        navigate('/404', { replace: true });
        return;
      }

      try {
        // Try to get the token from share_links table
        const { data, error } = await supabase
          .from('share_links')
          .select('token')
          .eq('id', shareId)
          .single();

        if (error || !data) {
          console.error('Share link not found:', error);
          navigate('/404', { replace: true });
          return;
        }

        // Redirect to the correct URL format
        console.log(`Redirecting from /shared/${shareId} to /s/${data.token}`);
        navigate(`/s/${data.token}`, { replace: true });
      } catch (err) {
        console.error('Error fetching share link:', err);
        navigate('/404', { replace: true });
      }
    };

    fetchTokenAndRedirect();
  }, [shareId, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-300">Redirecting...</p>
      </div>
    </div>
  );
}
