import React, { useState } from 'react';
import { 
  Scale, Plus, MoreVertical, Edit, Trash2, Unlock,
  FileText, Search, Calendar, User, AlertTriangle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useRetentionPolicies } from '@/hooks/useRetentionPolicies';
import { useLegalHoldDocCounts } from '@/hooks/useLegalHoldDocCounts';
import type { LegalHold } from '@/types/retention';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface LegalHoldsListProps {
  holds: LegalHold[];
  onCreateHold: () => void;
  onEditHold?: (hold: LegalHold) => void;
}

export const LegalHoldsList: React.FC<LegalHoldsListProps> = ({
  holds,
  onCreateHold,
  onEditHold,
}) => {
  const { releaseLegalHold } = useRetentionPolicies();
  const { docCounts } = useLegalHoldDocCounts(holds.map(h => h.id));
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [selectedHold, setSelectedHold] = useState<LegalHold | null>(null);
  const [releaseReason, setReleaseReason] = useState('');

  const filteredHolds = holds.filter(hold => {
    const matchesSearch = 
      hold.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hold.hold_reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hold.matter_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || hold.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRelease = async () => {
    if (selectedHold && releaseReason) {
      await releaseLegalHold(selectedHold.id, releaseReason);
      setReleaseDialogOpen(false);
      setSelectedHold(null);
      setReleaseReason('');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-purple-500';
      case 'released': return 'bg-green-500';
      case 'expired': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search legal holds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'released', 'expired'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
        <Button onClick={onCreateHold}>
          <Plus className="h-4 w-4 mr-2" />
          New Legal Hold
        </Button>
      </div>

      {/* Warning Banner */}
      <Card className="mb-4 bg-purple-500/10 border-purple-500/30 shrink-0">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-purple-500" />
          <div>
            <p className="text-sm font-medium">Legal Hold Protection Active</p>
            <p className="text-xs text-muted-foreground">
              Documents under legal hold are protected from deletion and retention policy actions
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Holds List */}
      <ScrollArea className="flex-1">
        <div className="space-y-3">
          {filteredHolds.map((hold) => (
            <Card key={hold.id} className={cn(hold.status !== 'active' && "opacity-60")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-2 rounded-lg",
                      hold.status === 'active' ? "bg-purple-500/10" : "bg-muted"
                    )}>
                      <Scale className={cn(
                        "h-5 w-5",
                        hold.status === 'active' ? "text-purple-500" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{hold.name}</h4>
                        <Badge className={getStatusColor(hold.status)}>
                          {hold.status}
                        </Badge>
                        {hold.matter_id && (
                          <Badge variant="outline">Matter: {hold.matter_id}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{hold.hold_reason}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Started: {new Date(hold.start_date).toLocaleDateString()}
                        </span>
                        {hold.end_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Ends: {new Date(hold.end_date).toLocaleDateString()}
                          </span>
                        )}
                        {hold.custodian_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {hold.custodian_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {docCounts.get(hold.id) || 0} documents
                        </span>
                      </div>
                      {hold.status === 'released' && hold.release_reason && (
                        <div className="mt-2 p-2 bg-muted rounded text-xs">
                          <span className="font-medium">Release reason:</span> {hold.release_reason}
                        </div>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditHold?.(hold)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Hold
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/documents', { state: { legalHoldId: hold.id, legalHoldName: hold.name } })}>
                        <FileText className="h-4 w-4 mr-2" />
                        View Documents
                      </DropdownMenuItem>
                      {hold.status === 'active' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedHold(hold);
                              setReleaseDialogOpen(true);
                            }}
                          >
                            <Unlock className="h-4 w-4 mr-2" />
                            Release Hold
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredHolds.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No legal holds found</h3>
              <p className="text-sm mb-4">Create a legal hold to protect documents from disposition</p>
              <Button onClick={onCreateHold}>
                <Plus className="h-4 w-4 mr-2" />
                Create Legal Hold
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Release Dialog */}
      <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release Legal Hold</DialogTitle>
            <DialogDescription>
              Releasing this hold will allow normal retention policies to apply to the protected documents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Hold Name</label>
              <p className="text-sm text-muted-foreground">{selectedHold?.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Reason for Release *</label>
              <Textarea
                placeholder="Provide a reason for releasing this legal hold..."
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRelease} disabled={!releaseReason}>
              <Unlock className="h-4 w-4 mr-2" />
              Release Hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
