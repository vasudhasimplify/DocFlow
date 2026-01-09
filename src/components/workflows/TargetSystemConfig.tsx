import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Server, Webhook, Database, HelpCircle, Lightbulb, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TargetSystemConfigProps {
  config: {
    enabled: boolean;
    system_type: 'sap';
    endpoint_url?: string;
    username?: string;
    password?: string;
    entity_set?: string;
    field_mapping?: Record<string, string>;
  };
  onChange: (config: any) => void;
}

export const TargetSystemConfig: React.FC<TargetSystemConfigProps> = ({ config, onChange }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const updateConfig = (updates: Partial<typeof config>) => {
    onChange({ ...config, ...updates, system_type: 'sap' });
  };

  const addFieldMapping = () => {
    const newMapping = { ...config.field_mapping, '': '' };
    updateConfig({ field_mapping: newMapping });
  };

  const updateFieldMapping = (oldKey: string, newKey: string, value: string) => {
    const newMapping = { ...config.field_mapping };
    if (oldKey !== newKey && oldKey in newMapping) {
      delete newMapping[oldKey];
    }
    newMapping[newKey] = value;
    updateConfig({ field_mapping: newMapping });
  };

  const removeFieldMapping = (key: string) => {
    const newMapping = { ...config.field_mapping };
    delete newMapping[key];
    updateConfig({ field_mapping: newMapping });
  };

  return (
    <div className="space-y-6">
      {/* Header with clear explanation */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-purple-500" />
              <h3 className="text-lg font-semibold">SAP Integration</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Automatically send approved workflow data to your SAP system (ERP, S/4HANA, etc.)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Connect this workflow to your company's SAP system
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => updateConfig({ enabled })}
          />
        </div>
      </div>

      {/* Info Alert when disabled */}
      {!config.enabled && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <Lightbulb className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-900">
            <strong>Don't have SAP? Skip this step!</strong>
            <br />
            <br />
            This feature is <strong>optional</strong> and only needed if:
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Your company uses SAP software (ERP system)</li>
              <li>You want approved documents to automatically sync to SAP</li>
              <li>Your IT team has given you SAP connection details</li>
            </ul>
            <br />
            If you don't have SAP, just leave this disabled and continue!
          </AlertDescription>
        </Alert>
      )}

      {config.enabled && (
        <div className="space-y-6 border-t pt-4">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              <strong>SAP Integration Active</strong> - Get connection details from your IT team
            </AlertDescription>
          </Alert>

          {/* SAP Configuration - Simplified with help text */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base flex items-center gap-2">
                SAP Server URL
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p className="font-semibold mb-2">Get this from your IT team or SAP administrator</p>
                      <p className="text-xs">The base URL is usually the same for all document types.</p>
                      <p className="text-xs mt-1">Example:</p>
                      <code className="text-xs bg-muted px-1 rounded">https://sap.company.com:8000/sap/opu/odata/sap/</code>
                      <p className="text-xs mt-2">They will add the service name (like INVOICE_SRV/) at the end.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                placeholder="https://your-sap-server.com:8000/sap/opu/odata/sap/"
                value={config.endpoint_url || ''}
                onChange={(e) => updateConfig({ endpoint_url: e.target.value })}
                className="font-mono text-sm"
              />
              <Alert className="mt-2">
                <Database className="h-3 w-3" />
                <AlertDescription className="text-xs">
                  <strong>Don't have this URL?</strong> Contact your IT team or SAP administrator. 
                  They can provide your company's SAP server address. It's usually the same base URL 
                  for all document types (invoices, purchase orders, etc.).
                </AlertDescription>
              </Alert>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Document Type (Where to send in SAP)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Choose what type of document this is:</p>
                      <p className="text-xs mt-1">• Invoices → Financial Accounting</p>
                      <p className="text-xs">• Purchase Orders → Procurement</p>
                      <p className="text-xs">• Contracts → Contract Management</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Select
                value={config.entity_set || ''}
                onValueChange={(entity_set) => updateConfig({ entity_set })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Invoices">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Invoices</span>
                      <span className="text-xs text-muted-foreground">Vendor bills, payables</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="PurchaseOrders">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Purchase Orders</span>
                      <span className="text-xs text-muted-foreground">Procurement, buying</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Contracts">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Contracts</span>
                      <span className="text-xs text-muted-foreground">Legal agreements</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="MaterialDocuments">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Material Documents</span>
                      <span className="text-xs text-muted-foreground">Inventory, stock movements</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="SalesOrders">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Sales Orders</span>
                      <span className="text-xs text-muted-foreground">Customer orders</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="DeliveryNotes">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Delivery Notes</span>
                      <span className="text-xs text-muted-foreground">Shipping documents</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This determines which SAP module receives the data
              </p>
            </div>

            {/* Field Mapping Section */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Field Mapping</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md">
                      <p className="font-semibold mb-2">Map your document fields to SAP fields</p>
                      <p className="text-xs mb-2">Our AI automatically extracts fields like:</p>
                      <ul className="text-xs space-y-1 ml-3">
                        <li>• invoice_number, amount, vendor, date (for invoices)</li>
                        <li>• po_number, supplier, total, delivery_date (for POs)</li>
                        <li>• contract_number, party_name, value (for contracts)</li>
                      </ul>
                      <p className="text-xs mt-2">Then map them to SAP field names (from your IT team)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>How it works:</strong>
                  <ol className="list-decimal ml-5 mt-2 space-y-1 text-xs">
                    <li>Our AI extracts data from your document (invoice number, amount, etc.)</li>
                    <li>You map those fields to SAP field names</li>
                    <li>When workflow completes, we send the mapped data to SAP</li>
                  </ol>
                  <p className="text-xs mt-2 text-muted-foreground">
                    Example: Map "invoice_number" → "InvoiceNumber" (SAP field name from IT team)
                  </p>
                </AlertDescription>
              </Alert>

              {config.field_mapping && Object.keys(config.field_mapping).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(config.field_mapping).map(([sourceField, targetField]) => (
                    <div key={sourceField} className="flex gap-2 items-center">
                      <div className="flex-1">
                        <Input
                          placeholder="AI extracted field (e.g., invoice_number)"
                          value={sourceField}
                          onChange={(e) => updateFieldMapping(sourceField, e.target.value, targetField)}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">From document (AI extracts this)</p>
                      </div>
                      <span className="flex items-center text-muted-foreground text-xl">→</span>
                      <div className="flex-1">
                        <Input
                          placeholder="SAP field (e.g., InvoiceNumber)"
                          value={targetField}
                          onChange={(e) => updateFieldMapping(sourceField, sourceField, e.target.value)}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">SAP field name (from IT team)</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFieldMapping(sourceField)}
                        title="Remove mapping"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/20">
                  <p className="text-sm text-muted-foreground">No field mappings configured yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click "Add Field Mapping" below to start mapping document fields to SAP
                  </p>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFieldMapping}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Field Mapping
              </Button>
            </div>

            {/* Simple/Advanced toggle for Authentication */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? 'Hide' : 'Show'} Authentication
              </Button>
              <span className="text-xs text-muted-foreground">(Required - Get from IT team)</span>
            </div>

            {showAdvanced && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SAP Username</Label>
                    <Input
                      placeholder="SAP username"
                      value={config.username || ''}
                      onChange={(e) => updateConfig({ username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SAP Password</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={config.password || ''}
                      onChange={(e) => updateConfig({ password: e.target.value })}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  ⚠️ Credentials are encrypted and stored securely
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
