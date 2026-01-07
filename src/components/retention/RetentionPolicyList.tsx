import React, { useState } from 'react';
import { 
  Shield, Plus, MoreVertical, Edit, Trash2, Copy, 
  CheckCircle, XCircle, Clock, Archive, Eye, Send,
  FileText, Filter, Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRetentionPolicies } from '@/hooks/useRetentionPolicies';
import type { RetentionPolicy, RetentionPolicyTemplate, ComplianceFramework } from '@/types/retention';
import { COMPLIANCE_FRAMEWORKS, DISPOSITION_ACTIONS, TRIGGER_TYPES } from '@/types/retention';
import { cn } from '@/lib/utils';

interface RetentionPolicyListProps {
  policies: RetentionPolicy[];
  templates: RetentionPolicyTemplate[];
  onCreatePolicy: () => void;
  onEditPolicy?: (policy: RetentionPolicy) => void;
  onDuplicatePolicy?: (policy: RetentionPolicy) => void;
}

export const RetentionPolicyList: React.FC<RetentionPolicyListProps> = ({
  policies,
  templates,
  onCreatePolicy,
  onEditPolicy,
  onDuplicatePolicy,
}) => {
  const { updatePolicy, deletePolicy } = useRetentionPolicies();
  const [searchQuery, setSearchQuery] = useState('');
  const [frameworkFilter, setFrameworkFilter] = useState<string>('all');

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFramework = frameworkFilter === 'all' || policy.compliance_framework === frameworkFilter;
    return matchesSearch && matchesFramework;
  });

  const getDispositionIcon = (action: string) => {
    switch (action) {
      case 'delete': return Trash2;
      case 'archive': return Archive;
      case 'review': return Eye;
      case 'transfer': return Send;
      default: return FileText;
    }
  };

  const formatRetentionPeriod = (days: number) => {
    if (days >= 365) {
      const years = Math.floor(days / 365);
      return `${years} year${years > 1 ? 's' : ''}`;
    }
    if (days >= 30) {
      const months = Math.floor(days / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    }
    return `${days} day${days > 1 ? 's' : ''}`;
  };

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search policies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={frameworkFilter} onValueChange={setFrameworkFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Frameworks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Frameworks</SelectItem>
            {COMPLIANCE_FRAMEWORKS.map((fw) => (
              <SelectItem key={fw.value} value={fw.value}>{fw.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={onCreatePolicy}>
          <Plus className="h-4 w-4 mr-2" />
          New Policy
        </Button>
      </div>

      {/* Policy Templates */}
      {templates.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Quick Start Templates
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {templates.slice(0, 6).map((template) => (
              <Card 
                key={template.id} 
                className="min-w-[200px] cursor-pointer hover:border-primary transition-colors"
                onClick={onCreatePolicy}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {template.compliance_framework}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium truncate">{template.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRetentionPeriod(template.retention_period_days)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Policies List */}
      <div className="space-y-3">
          {filteredPolicies.map((policy) => {
            const DispositionIcon = getDispositionIcon(policy.disposition_action);
            const triggerType = TRIGGER_TYPES.find(t => t.value === policy.trigger_type);
            
            return (
              <Card key={policy.id} className={cn(!policy.is_active && "opacity-60")}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "p-2 rounded-lg",
                        policy.is_active ? "bg-primary/10" : "bg-muted"
                      )}>
                        <Shield className={cn(
                          "h-5 w-5",
                          policy.is_active ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{policy.name}</h4>
                          {policy.compliance_framework && (
                            <Badge variant="secondary">{policy.compliance_framework}</Badge>
                          )}
                          {policy.requires_approval && (
                            <Badge variant="outline" className="text-xs">
                              Requires Approval
                            </Badge>
                          )}
                        </div>
                        {policy.description && (
                          <p className="text-sm text-muted-foreground mb-2">{policy.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRetentionPeriod(policy.retention_period_days)}
                          </span>
                          <span className="flex items-center gap-1">
                            <DispositionIcon className="h-3 w-3" />
                            {policy.disposition_action}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {triggerType?.label || policy.trigger_type}
                          </span>
                          {policy.applies_to_categories?.length > 0 && (
                            <span>
                              {policy.applies_to_categories.length} categories
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={policy.is_active}
                        onCheckedChange={(checked) => updatePolicy(policy.id, { is_active: checked })}
                        className={cn(
                          // smaller switch sizing and use primary color when checked
                          "h-5 w-9",
                          policy.is_active ? "data-[state=checked]:bg-primary-600" : "data-[state=unchecked]:bg-gray-200"
                        )}
                      />
                      <Badge
                        variant={policy.is_active ? "default" : "secondary"}
                        className={cn(
                          "text-xs font-medium min-w-[40px] text-center",
                          policy.is_active ? "bg-primary-600 text-white" : "bg-gray-300 text-gray-800"
                        )}
                      >
                        {policy.is_active ? 'ON' : 'OFF'}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEditPolicy?.(policy)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Policy
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDuplicatePolicy?.(policy)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => deletePolicy(policy.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredPolicies.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No policies found</h3>
              <p className="text-sm mb-4">Create your first retention policy to get started</p>
              <Button onClick={onCreatePolicy}>
                <Plus className="h-4 w-4 mr-2" />
                Create Policy
              </Button>
            </div>
          )}
      </div>
    </div>
  );
};
