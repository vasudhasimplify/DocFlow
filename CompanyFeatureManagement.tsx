import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building, Shield, TrendingUp, Calendar, Users, Briefcase, Package, Sparkles } from 'lucide-react';

interface Feature {
  id: string;
  feature_code: string;
  feature_name: string;
  feature_description: string;
  feature_category: string;
  is_premium: boolean;
  default_enabled: boolean;
}

interface CompanyFeatureAccess {
  id?: string;
  feature_id: string;
  is_enabled: boolean;
  usage_limit?: number;
  usage_count: number;
  notes?: string;
  expires_at?: string;
}

interface Props {
  companyId: string;
  companyName: string;
}

export const CompanyFeatureManagement: React.FC<Props> = ({ companyId, companyName }) => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [featureAccess, setFeatureAccess] = useState<Map<string, CompanyFeatureAccess>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const fetchData = async () => {
    try {
      // Fetch all features
      const { data: featuresData, error: featuresError } = await supabase
        .from('features' as any)
        .select('*')
        .eq('is_active', true)
        .order('feature_category', { ascending: true })
        .order('sort_order', { ascending: true });

      if (featuresError) throw featuresError;

      // Fetch company's feature access
      const { data: accessData, error: accessError } = await supabase
        .from('company_feature_access' as any)
        .select('*')
        .eq('company_id', companyId);

      if (accessError) throw accessError;

      setFeatures(featuresData as any || []);

      // Convert access data to map
      const accessMap = new Map<string, CompanyFeatureAccess>();
      (accessData as any)?.forEach((access: any) => {
        accessMap.set(access.feature_id, access);
      });
      setFeatureAccess(accessMap);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (feature: Feature) => {
    const currentAccess = featureAccess.get(feature.id);
    const newEnabled = currentAccess ? !currentAccess.is_enabled : !feature.default_enabled;

    setSaving(true);
    try {
      if (currentAccess?.id) {
        // Update existing record
        const { error } = await supabase
          .from('company_feature_access' as any)
          .update({ 
            is_enabled: newEnabled,
            enabled_at: newEnabled ? new Date().toISOString() : (currentAccess as any).enabled_at,
            disabled_at: !newEnabled ? new Date().toISOString() : null,
          })
          .eq('id', currentAccess.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('company_feature_access' as any)
          .insert({
            company_id: companyId,
            feature_id: feature.id,
            is_enabled: newEnabled,
          });

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `${feature.feature_name} ${newEnabled ? 'enabled' : 'disabled'} for ${companyName}`,
      });

      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error toggling feature:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      dashboard_stats: TrendingUp,
      job_management: Briefcase,
      application_management: Users,
      interview_scheduling: Calendar,
      background_verification: Shield,
      analytics: TrendingUp,
      vendor_management: Building,
      ai_features: Sparkles,
      export_data: Package,
    };
    const Icon = icons[category] || Briefcase;
    return <Icon className="w-5 h-5" />;
  };

  // Group features by category
  const groupedFeatures = features.reduce((acc, feature) => {
    if (!acc[feature.feature_category]) {
      acc[feature.feature_category] = [];
    }
    acc[feature.feature_category].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  if (loading) {
    return <div className="p-6 text-center">Loading features...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Feature Access Control</h2>
          <p className="text-muted-foreground">
            Manage feature access for {companyName}
          </p>
        </div>
      </div>

      {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getCategoryIcon(category)}
              {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </CardTitle>
            <CardDescription>
              {categoryFeatures.length} features in this category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryFeatures.map(feature => {
                const access = featureAccess.get(feature.id);
                const isEnabled = access?.is_enabled ?? feature.default_enabled;

                return (
                  <div
                    key={feature.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Label className="font-semibold">{feature.feature_name}</Label>
                        {feature.is_premium && (
                          <Badge variant="secondary" className="text-xs">Premium</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {feature.feature_description}
                      </p>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {feature.feature_code}
                      </code>
                    </div>

                    <div className="flex items-center gap-4">
                      {access?.usage_limit && (
                        <div className="text-right text-sm">
                          <div className="text-muted-foreground">Usage</div>
                          <div className="font-semibold">
                            {access.usage_count} / {access.usage_limit}
                          </div>
                        </div>
                      )}

                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => toggleFeature(feature)}
                        disabled={saving}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
