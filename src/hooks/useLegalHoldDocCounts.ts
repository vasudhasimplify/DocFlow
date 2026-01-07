import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useLegalHoldDocCounts = (holdIds: string[]) => {
  const [docCounts, setDocCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchDocCounts = async () => {
      if (holdIds.length === 0) return;
      
      setIsLoading(true);
      const counts = new Map<string, number>();
      
      try {
        for (const holdId of holdIds) {
          const { count, error } = await supabase
            .from('document_retention_status')
            .select('*', { count: 'exact', head: true })
            .contains('legal_hold_ids', [holdId]);
          
          if (!error) {
            counts.set(holdId, count || 0);
          } else {
            console.error(`Error counting docs for hold ${holdId}:`, error);
            counts.set(holdId, 0);
          }
        }
        
        setDocCounts(counts);
      } catch (error) {
        console.error('Error fetching document counts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocCounts();
  }, [holdIds.join(',')]);

  return { docCounts, isLoading };
};
