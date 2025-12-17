import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type {
  EnhancedLegalHold,
  LegalHoldCustodian,
  LegalHoldAuditEntry,
  CreateLegalHoldParams
} from '@/types/legalHold';
import { legalHoldApi } from '@/services/legalHoldApi';

export function useLegalHolds() {
  const [holds, setHolds] = useState<EnhancedLegalHold[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchHolds = useCallback(async () => {
    setLoading(true);
    try {
      const data = await legalHoldApi.getHolds();
      setHolds(data);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch legal holds',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createHold = useCallback(async (params: CreateLegalHoldParams): Promise<EnhancedLegalHold | null> => {
    setLoading(true);
    try {
      const newHold = await legalHoldApi.createHold(params);
      setHolds(prev => [newHold, ...prev]);
      toast({
        title: 'Legal hold created',
        description: `"${newHold.name}" has been created and is now active`
      });
      return newHold;
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to create legal hold',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const releaseHold = useCallback(async (
    holdId: string,
    reason: string,
    approvedBy?: string
  ): Promise<boolean> => {
    try {
      await legalHoldApi.releaseHold(holdId, reason, approvedBy);

      // Refresh holds to get updated status and stats
      await fetchHolds();

      toast({
        title: 'Legal hold released',
        description: 'The legal hold has been lifted and custodians notified'
      });
      return true;
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to release legal hold',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast, fetchHolds]);

  const addCustodian = useCallback(async (
    holdId: string,
    custodian: { name: string; email: string; department?: string; title?: string }
  ): Promise<boolean> => {
    try {
      await legalHoldApi.addCustodian(holdId, custodian);

      // Refresh to get updated stats
      await fetchHolds();

      toast({
        title: 'Custodian added',
        description: `${custodian.name} has been added and notified`
      });
      return true;
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to add custodian',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast, fetchHolds]);

  const removeCustodian = useCallback(async (holdId: string, custodianId: string): Promise<boolean> => {
    try {
      await legalHoldApi.removeCustodian(holdId, custodianId);

      await fetchHolds();

      toast({
        title: 'Custodian removed',
        description: 'The custodian has been removed from this hold'
      });
      return true;
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to remove custodian',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast, fetchHolds]);

  const sendReminder = useCallback(async (holdId: string, custodianId: string): Promise<boolean> => {
    try {
      await legalHoldApi.sendReminder(holdId, custodianId);

      await fetchHolds();

      toast({
        title: 'Reminder sent',
        description: 'A reminder has been sent to the custodian'
      });
      return true;
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to send reminder',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast, fetchHolds]);

  const escalateCustodian = useCallback(async (holdId: string, custodianId: string): Promise<boolean> => {
    try {
      await legalHoldApi.escalateCustodian(holdId, custodianId);

      await fetchHolds();

      toast({
        title: 'Custodian escalated',
        description: 'Escalation contacts have been notified'
      });
      return true;
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to escalate',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast, fetchHolds]);

  const getAuditTrail = useCallback(async (holdId: string): Promise<LegalHoldAuditEntry[]> => {
    try {
      return await legalHoldApi.getAuditTrail(holdId);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch audit trail',
        variant: 'destructive'
      });
      return [];
    }
  }, [toast]);

  useEffect(() => {
    fetchHolds();
  }, [fetchHolds]);

  return {
    holds,
    loading,
    fetchHolds,
    createHold,
    releaseHold,
    addCustodian,
    removeCustodian,
    sendReminder,
    escalateCustodian,
    getAuditTrail
  };
}
