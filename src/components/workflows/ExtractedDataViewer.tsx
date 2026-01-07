import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Database,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { WorkflowInstance } from '@/types/workflow';
import { useState } from 'react';

interface ExtractedDataViewerProps {
  instance: WorkflowInstance;
}

const statusConfig = {
  extracted: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Extracted Successfully'
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Extraction Failed'
  },
  no_schema: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'No Schema Defined'
  },
  not_ready: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Processing Document'
  },
  error: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Extraction Error'
  }
};

export const ExtractedDataViewer: React.FC<ExtractedDataViewerProps> = ({ instance }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Don't show if no extraction was attempted
  if (!instance.extraction_status) {
    return null;
  }

  const status = instance.extraction_status;
  const config = statusConfig[status] || statusConfig.error;
  const StatusIcon = config.icon;

  const toggleSection = (key: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSections(newExpanded);
  };

  const renderValue = (value: any, depth: number = 0): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">Not provided</span>;
    }

    if (typeof value === 'boolean') {
      return <Badge variant={value ? 'default' : 'secondary'}>{value ? 'Yes' : 'No'}</Badge>;
    }

    if (typeof value === 'number') {
      return <span className="font-mono text-sm">{value.toLocaleString()}</span>;
    }

    if (typeof value === 'string') {
      // Check if it's a date string
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
        try {
          const date = new Date(value);
          return <span className="text-sm">{date.toLocaleDateString()}</span>;
        } catch {
          return <span className="text-sm">{value}</span>;
        }
      }
      return <span className="text-sm">{value}</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-gray-400 italic">Empty list</span>;
      }

      // Check if it's array of objects (like line items)
      if (typeof value[0] === 'object') {
        return (
          <div className="space-y-2 mt-2">
            {value.map((item, index) => (
              <div key={index} className="border rounded-lg p-3 bg-gray-50">
                <div className="text-xs font-medium text-gray-500 mb-2">Item {index + 1}</div>
                {Object.entries(item).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm py-1">
                    <span className="text-gray-600">{k.replace(/_/g, ' ')}:</span>
                    <span className="font-medium">{renderValue(v, depth + 1)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      }

      return (
        <div className="flex flex-wrap gap-1 mt-1">
          {value.map((item, index) => (
            <Badge key={index} variant="outline">{String(item)}</Badge>
          ))}
        </div>
      );
    }

    if (typeof value === 'object') {
      return (
        <div className="space-y-1 mt-2 pl-4 border-l-2 border-gray-200">
          {Object.entries(value).map(([k, v]) => (
            <div key={k} className="text-sm">
              <span className="text-gray-600">{k.replace(/_/g, ' ')}: </span>
              {renderValue(v, depth + 1)}
            </div>
          ))}
        </div>
      );
    }

    return <span className="text-sm">{String(value)}</span>;
  };

  return (
    <Card className={`${config.borderColor} border-2`}>
      <CardHeader className={config.bgColor}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${config.color}`} />
            <CardTitle className="text-base">Extracted Document Data</CardTitle>
          </div>
          <Badge variant="outline" className={config.color}>
            {config.label}
          </Badge>
        </div>
        <CardDescription>
          Structured data extracted from document for workflow processing
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        {status === 'extracted' && instance.extracted_data ? (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {Object.entries(instance.extracted_data).map(([key, value]) => {
                const isExpanded = expandedSections.has(key);
                const isComplex = typeof value === 'object' && value !== null;

                return (
                  <div key={key} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <div 
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => isComplex && toggleSection(key)}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {isComplex && (
                          <div className="text-gray-400">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-gray-700 capitalize text-sm">
                            {key.replace(/_/g, ' ')}
                          </div>
                          {!isComplex && (
                            <div className="mt-0.5">
                              {renderValue(value)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {isComplex && isExpanded && (
                      <div className="mt-2 pt-2 border-t">
                        {renderValue(value)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : status === 'not_ready' ? (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Document is still being processed. Extracted data will be available once processing completes.
            </AlertDescription>
          </Alert>
        ) : status === 'no_schema' ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No extraction schema is defined for this document type. Add a schema to enable automatic field extraction.
            </AlertDescription>
          </Alert>
        ) : status === 'failed' ? (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Field extraction failed. The document may be corrupted or in an unsupported format.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              An error occurred during extraction. Please try reprocessing the document.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
