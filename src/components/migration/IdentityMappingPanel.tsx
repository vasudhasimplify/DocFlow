import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Users,
  User,
  UserPlus,
  Check,
  X,
  AlertCircle,
  Upload,
  Download,
  Loader2,
  Trash2,
  Search
} from 'lucide-react';
import { useMigration } from '@/hooks/useMigration';
import type { IdentityMapping, SourceSystem } from '@/types/migration';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface IdentityMappingPanelProps {
  mappings: IdentityMapping[];
}

export function IdentityMappingPanel({ mappings }: IdentityMappingPanelProps) {
  const { saveIdentityMapping, deleteIdentityMapping } = useMigration();
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newMapping, setNewMapping] = useState({
    source_system: 'google_drive' as SourceSystem,
    source_principal_id: '',
    source_principal_type: 'user' as 'user' | 'group' | 'domain' | 'anyone',
    source_email: '',
    source_display_name: '',
    target_user_id: '',
    role_mapping: {},
    fallback_action: 'owner_only' as 'owner_only' | 'skip' | 'report'
  });

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoadingProfiles(true);

      try {
        // Fetch users from backend API (uses auth.admin.list_users())
        const response = await fetch('http://localhost:8000/api/migration/users');
        if (response.ok) {
          const data = await response.json();
          console.log(`Fetched ${data.length} users from auth.users`);
          setProfiles(data);
        } else {
          console.error('Failed to fetch users from API');
          setProfiles([]);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
        setProfiles([]);
      }

      setLoadingProfiles(false);
    };
    fetchProfiles();
  }, []);

  const groupedMappings = mappings.reduce((acc, m) => {
    if (!acc[m.source_system]) acc[m.source_system] = [];
    acc[m.source_system].push(m);
    return acc;
  }, {} as Record<string, IdentityMapping[]>);

  const handleAddMapping = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    let targetUuid = newMapping.target_user_id;

    // Logic: If input is an email, try to resolve it to UUID
    if (targetUuid && targetUuid.includes('@')) {
      // Look up email in the already-fetched profiles (from auth.users)
      const foundProfile = profiles.find(p => p.email?.toLowerCase() === targetUuid.toLowerCase());

      if (foundProfile) {
        targetUuid = foundProfile.id;
      } else {
        // If checking fails, but user is 'me', use my ID
        if (targetUuid.toLowerCase() === userData.user.email?.toLowerCase()) {
          targetUuid = userData.user.id;
        } else {
          toast({
            title: "User not found",
            description: "Could not find a SimplifyDrive user with that email. Please ensure the user exists.",
            variant: "destructive"
          });
          return; // Stop saving
        }
      }
    }

    // Ensure we are not saving an email into a UUID column
    if (targetUuid && targetUuid.includes('@')) {
      toast({
        title: "Invalid User ID",
        description: "Unable to resolve email to User ID. Database requires a UUID.",
        variant: "destructive"
      });
      return;
    }

    saveIdentityMapping({
      user_id: userData.user.id,
      ...newMapping,
      target_user_id: targetUuid, // Use the resolved UUID
      is_verified: false
    });
    setShowAddDialog(false);
    resetNewMapping();
    toast({ title: "Mapping added successfully" });
  };

  const fillCurrentUser = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user?.email) {
      setNewMapping(prev => ({ ...prev, target_user_id: data.user.email || '' }));
    }
  };

  const resetNewMapping = () => {
    setNewMapping({
      source_system: 'google_drive',
      source_principal_id: '',
      source_principal_type: 'user',
      source_email: '',
      source_display_name: '',
      target_user_id: '',
      role_mapping: {},
      fallback_action: 'owner_only'
    });
  };

  const handleExportCSV = () => {
    const headers = ['source_system', 'source_principal_type', 'source_email', 'source_display_name', 'target_user_id', 'fallback_action'].join(',');
    const rows = mappings.map(m => [
      m.source_system,
      m.source_principal_type,
      m.source_email || '',
      m.source_display_name || '',
      m.target_user_id || '',
      m.fallback_action
    ].join(','));

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'identity_mappings.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').slice(1); // Skip header
      const { data: userData } = await supabase.auth.getUser();

      let importedCount = 0;

      for (const row of rows) {
        if (!row.trim()) continue;
        const [sys, type, email, name, targetId, fallback] = row.split(',');

        saveIdentityMapping({
          user_id: userData.user?.id || '',
          source_system: sys as any,
          source_principal_type: type as any,
          source_principal_id: email || name, // Use email as ID if available
          source_email: email,
          source_display_name: name,
          target_user_id: targetId,
          role_mapping: {},
          fallback_action: fallback as any,
          is_verified: false
        });
        importedCount++;
      }
      toast({ title: `Imported ${importedCount} mappings` });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const verifyMapping = async (mapping: IdentityMapping) => {
    if (!mapping.target_user_id) {
      // If empty, verify if fallback is set
      if (mapping.fallback_action) {
        saveIdentityMapping({ ...mapping, is_verified: true });
        toast({ title: "Mapping verified", description: "Fallback action confirmed." });
      }
      return;
    }

    const input = mapping.target_user_id;
    const isEmail = input.includes('@');

    // Logic: check if target user exists (by ID or Email)
    const { data: userData } = await supabase.auth.getUser();

    // FAST CHECK: If it is ME, verify immediately
    if (userData.user && (input === userData.user.id || input === userData.user.email)) {
      saveIdentityMapping({
        ...mapping,
        target_user_id: userData.user.id, // Ensure ID is saved if email was matched
        is_verified: true
      });
      toast({ title: "Mapping verified", description: "Confirmed as current user." });
      return;
    }

    const query = supabase.from('profiles').select('id, email, full_name');

    if (isEmail) {
      query.eq('email', input);
    } else {
      query.eq('id', input);
    }

    const { data, error } = await query.maybeSingle();

    if (data) {
      // If found, we update the mapping with the ACTUAL UUID if it was an email
      const updates = {
        ...mapping,
        is_verified: true,
        // If we found them by email, let's save the UUID to be clean, 
        // OR we keep the email if the backend handles it. 
        // Better to keep as is for display but verify it exists.
      };
      saveIdentityMapping(updates);
      toast({
        title: "Mapping verified",
        description: `Confirmed user: ${data.full_name || data.email}`
      });
    } else {
      toast({
        title: "Verification failed",
        description: `User not found by ${isEmail ? 'email' : 'ID'}: ${input}`,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Identity Mappings
              </CardTitle>
              <CardDescription>
                Map users and groups from source systems to SimplifyDrive
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImportCSV}
              />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Mapping
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Add Identity Mapping</DialogTitle>
                    <DialogDescription>
                      Map a user or group from a source system to SimplifyDrive
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Source System</Label>
                        <Select
                          value={newMapping.source_system}
                          onValueChange={(v: SourceSystem) =>
                            setNewMapping({ ...newMapping, source_system: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="google_drive">Google Drive</SelectItem>
                            <SelectItem value="onedrive">OneDrive</SelectItem>
                            <SelectItem value="filenet">FileNet</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Principal Type</Label>
                        <Select
                          value={newMapping.source_principal_type}
                          onValueChange={(v: any) =>
                            setNewMapping({ ...newMapping, source_principal_type: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="group">Group</SelectItem>
                            <SelectItem value="domain">Domain</SelectItem>
                            <SelectItem value="anyone">Anyone</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Source Email</Label>
                      <Input
                        type="email"
                        placeholder="user@source-domain.com"
                        value={newMapping.source_email}
                        onChange={(e) => setNewMapping({
                          ...newMapping,
                          source_email: e.target.value,
                          source_principal_id: e.target.value
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Source Display Name</Label>
                      <Input
                        placeholder="John Doe"
                        value={newMapping.source_display_name}
                        onChange={(e) => setNewMapping({ ...newMapping, source_display_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Target User (SimplifyDrive)</Label>
                      {loadingProfiles ? (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading users...
                        </div>
                      ) : profiles.length > 0 ? (
                        <div className="space-y-2">
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search users by email or name..."
                              value={userSearch}
                              onChange={(e) => setUserSearch(e.target.value)}
                              className="pl-8"
                            />
                          </div>
                          <Select
                            value={newMapping.target_user_id || "no_user_selected"}
                            onValueChange={(v) => {
                              setNewMapping({ ...newMapping, target_user_id: v === "no_user_selected" ? "" : v });
                              setUserSearch(''); // Clear search after selection
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a user">
                                {newMapping.target_user_id
                                  ? profiles.find(p => p.id === newMapping.target_user_id)?.email || newMapping.target_user_id
                                  : "Select a user"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              <SelectItem value="no_user_selected">(None - use fallback)</SelectItem>
                              {profiles
                                .filter(p =>
                                  !userSearch ||
                                  (p.email?.toLowerCase().includes(userSearch.toLowerCase())) ||
                                  (p.full_name?.toLowerCase().includes(userSearch.toLowerCase()))
                                )
                                .map(profile => (
                                  <SelectItem key={profile.id} value={profile.id}>
                                    {profile.email} {profile.full_name ? `(${profile.full_name})` : ''}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            {profiles.length} users available • Type to filter
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            placeholder="target.user@simplifydrive.com"
                            value={newMapping.target_user_id}
                            onChange={(e) => setNewMapping({ ...newMapping, target_user_id: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Enter the SimplifyDrive User Email. We will attempt to find the user.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Fallback Action</Label>
                      <Select
                        value={newMapping.fallback_action}
                        onValueChange={(v: any) =>
                          setNewMapping({ ...newMapping, fallback_action: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner_only">Owner only (restrict access)</SelectItem>
                          <SelectItem value="skip">Skip permission</SelectItem>
                          <SelectItem value="report">Report for review</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddMapping}>
                      Add Mapping
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedMappings).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No identity mappings configured</p>
              <p className="text-sm">
                Add mappings to ensure permissions are correctly applied during migration
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedMappings).map(([system, systemMappings]) => (
                <div key={system}>
                  <h3 className="font-semibold mb-3 capitalize">
                    {system.replace('_', ' ')}
                  </h3>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {systemMappings.map((mapping) => (
                        <div
                          key={mapping.id}
                          className="flex items-center gap-4 p-3 rounded-lg border"
                        >
                          <User className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="font-medium">
                              {mapping.source_display_name || mapping.source_email || mapping.source_principal_id}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {mapping.source_email}
                            </p>
                          </div>

                          {/* Target User Info */}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>→</span>
                            <Badge variant="outline">
                              {profiles.find(p => p.id === mapping.target_user_id)?.full_name || mapping.source_display_name || mapping.target_user_id || 'Fallback'}
                            </Badge>
                          </div>

                          <Badge variant="outline">
                            {mapping.source_principal_type}
                          </Badge>

                          {mapping.is_verified ? (
                            <Badge className="bg-green-500 cursor-default">
                              <Check className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-yellow-600 hover:text-yellow-700 bg-yellow-100 hover:bg-yellow-200"
                              onClick={async () => {
                                // Enhanced verify function inline or call the one below
                                verifyMapping(mapping);
                              }}
                            >
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Verify
                            </Button>
                          )}
                          <Badge variant="outline">
                            {mapping.fallback_action.replace('_', ' ')}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                            onClick={() => deleteIdentityMapping(mapping.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
