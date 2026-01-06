/**
 * DataRenderer Component - Comprehensive document data rendering
 * Handles all data types: tables, nested objects, arrays, signatures, etc.
 * Restored from Upload.deprecated.tsx with complete logic
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { FileText, User, MapPin, Mail, Building, GraduationCap } from 'lucide-react';

interface DataRendererProps {
  hierarchicalData: Record<string, unknown>;
  isEditingData: boolean;
  editedData: Record<string, Record<string, string>>;
  onFieldChange: (sectionKey: string, fieldKey: string, value: string) => void;
}

export const DataRenderer: React.FC<DataRendererProps> = ({
  hierarchicalData,
  isEditingData,
  editedData,
  onFieldChange
}) => {
  // ============================================================================
  // HELPER FUNCTIONS AND TYPE CHECKERS
  // ============================================================================

  /**
   * Check if a value is a primitive type
   */
  const isPrimitive = (val: unknown): boolean => (
    val === null || ['string', 'number', 'boolean'].includes(typeof val)
  );

  /**
   * Check if value is a plain object (not array or other types)
   */
  const isPlainObject = (val: unknown): boolean => (
    val !== null && typeof val === 'object' && !Array.isArray(val) && Object.prototype.toString.call(val) === '[object Object]'
  );

  /**
   * Check if object contains only flat primitive values
   */
  const _isFlatPrimitiveObject = (obj: unknown): boolean => (
    isPlainObject(obj) && Object.values(obj as Record<string, unknown>).every(isPrimitive)
  );

  /**
   * Check if array contains uniform objects with same/similar keys (table-like data)
   * More lenient: considers data tabular if objects share at least 70% of keys
   */
  const arrayOfObjectsWithSameKeys = (arr: unknown[]): boolean => {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    if (!arr.every(item => isPlainObject(item))) return false;
    
    // Get union of all keys across all objects
    const allKeys = new Set<string>();
    arr.forEach(item => {
      Object.keys(item as Record<string, unknown>).forEach(key => allKeys.add(key));
    });
    
    // If only 1-2 keys, use exact matching
    if (allKeys.size <= 2) {
      const keys = Object.keys(arr[0] as Record<string, unknown>).sort().join('|');
      return arr.every(item => Object.keys(item as Record<string, unknown>).sort().join('|') === keys);
    }
    
    // For more keys, check if each object has at least 70% of all keys
    const minKeysRequired = Math.ceil(allKeys.size * 0.7);
    const hasEnoughOverlap = arr.every(item => {
      const itemKeys = Object.keys(item as Record<string, unknown>);
      const overlap = itemKeys.filter(k => allKeys.has(k)).length;
      return overlap >= minKeysRequired;
    });
    
    return hasEnoughOverlap;
  };

  /**
   * Check if key is a section title key (to be filtered out)
   */
  const isSectionTitleKey = (key: string): boolean => {
    const s = key.replace(/[:_]/g, ' ').toLowerCase().trim();
    return s === 'section title' || s === 'section' || s === 'section name' || s === 'section header' || s === 'title';
  };

  /**
   * Check if object structure represents a column-based table
   * (columns as keys, values as arrays of same length)
   */
  const isColumnBasedTable = (obj: unknown): boolean => {
    if (!isPlainObject(obj)) return false;
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length < 2) return false; // Need at least 2 columns

    const firstArray = entries.find(([_, v]) => Array.isArray(v));
    if (!firstArray || !Array.isArray(firstArray[1])) return false;

    const expectedLength = firstArray[1].length;
    if (expectedLength === 0) return false;

    return entries.every(([_, v]) => Array.isArray(v) && v.length === expectedLength);
  };

  /**
   * Convert column-based table to row-based table
   */
  const convertColumnBasedToRowBased = (obj: Record<string, unknown[]>): Record<string, unknown>[] => {
    const columns = Object.keys(obj);
    const firstColumn = obj[columns[0]];
    if (!Array.isArray(firstColumn)) return [];

    const rowCount = firstColumn.length;
    return Array.from({ length: rowCount }, (_, rowIndex) => {
      const row: Record<string, unknown> = {};
      columns.forEach(column => {
        const columnValues = obj[column];
        row[column] = Array.isArray(columnValues) && columnValues[rowIndex] !== undefined
          ? columnValues[rowIndex]
          : null;
      });
      return row;
    });
  };

  /**
   * Find column order metadata with fallback strategies
   */
  const findColumnOrder = (searchObj: Record<string, unknown>, sectionKey: string, tableArrayKey?: string): string[] | null => {
    if (!searchObj || typeof searchObj !== 'object') return null;

    const columnOrderKey = tableArrayKey
      ? `_${sectionKey}_${tableArrayKey}_columnOrder`
      : `_${sectionKey}_columnOrder`;

    console.log('🔎 findColumnOrder called:', { sectionKey, tableArrayKey, columnOrderKey, availableKeys: Object.keys(searchObj).filter(k => k.includes('columnOrder')) });

    // First try exact match (without page suffix)
    let columnOrder = searchObj[columnOrderKey];
    if (Array.isArray(columnOrder) && columnOrder.length > 0) {
      console.log('✅ Found exact match:', columnOrderKey, columnOrder);
      return columnOrder as string[];
    }

    // If not found, try to find key with page suffix pattern
    const escapedSectionKey = sectionKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (tableArrayKey) {
      const escapedTableArrayKey = String(tableArrayKey).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pageSuffixPattern = new RegExp(`^_${escapedSectionKey}_page_\\d+_${escapedTableArrayKey}_columnOrder$`);
      const matchingKey = Object.keys(searchObj).find(k => pageSuffixPattern.test(k));
      if (matchingKey) {
        columnOrder = searchObj[matchingKey];
        if (Array.isArray(columnOrder) && columnOrder.length > 0) {
          return columnOrder as string[];
        }
      }
    } else {
      const pageSuffixPattern = new RegExp(`^_${escapedSectionKey}_page_\\d+_columnOrder$`);
      const matchingKey = Object.keys(searchObj).find(k => pageSuffixPattern.test(k));
      if (matchingKey) {
        columnOrder = searchObj[matchingKey];
        if (Array.isArray(columnOrder) && columnOrder.length > 0) {
          return columnOrder as string[];
        }
      }
    }

    // Also try to find any key that matches the pattern after removing page suffixes
    const normalizedTargetKey = columnOrderKey;
    const normalizedMatchingKey = Object.keys(searchObj).find(k => {
      if (!k.endsWith('_columnOrder')) return false;
      const normalizedKey = k.replace(/_page_\d+/gi, '').replace(/__+/g, '_');
      return normalizedKey === normalizedTargetKey;
    });
    if (normalizedMatchingKey) {
      columnOrder = searchObj[normalizedMatchingKey];
      if (Array.isArray(columnOrder) && columnOrder.length > 0) {
        return columnOrder as string[];
      }
    }

    return null;
  };

  /**
   * Parse JSON string values
   */
  const parseFieldValue = (value: string | unknown): unknown => {
    if (!value || typeof value !== 'string') return value;

    const trimmedValue = value.trim();

    if (!trimmedValue.startsWith('[') && !trimmedValue.startsWith('{')) {
      return value;
    }

    try {
      return JSON.parse(trimmedValue);
    } catch (_error1) {
      try {
        const cleanedValue = trimmedValue.replace(/'/g, '"');
        return JSON.parse(cleanedValue);
      } catch (_error2) {
        try {
          const cleanedValue = trimmedValue
            .replace(/'/g, '"')
            .replace(/True/g, 'true')
            .replace(/False/g, 'false')
            .replace(/None/g, 'null');
          return JSON.parse(cleanedValue);
        } catch (_error3) {
          return value;
        }
      }
    }
  };

  /**
   * Get section icon based on name
   */
  const getSectionIcon = (sectionName: string) => {
    const name = sectionName.toLowerCase();
    if (name.includes('document') || name.includes('info')) return <FileText className="h-4 w-4" />;
    if (name.includes('personal') || name.includes('details')) return <User className="h-4 w-4" />;
    if (name.includes('address') || name.includes('domicile') || name.includes('correspondence') || name.includes('permanent')) return <MapPin className="h-4 w-4" />;
    if (name.includes('contact') || name.includes('email') || name.includes('mobile')) return <Mail className="h-4 w-4" />;
    if (name.includes('category') || name.includes('government') || name.includes('employee')) return <Building className="h-4 w-4" />;
    if (name.includes('education') || name.includes('qualification') || name.includes('preferential')) return <GraduationCap className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  /**
   * Format field names for display
   */
  const formatFieldName = (fieldName: string): string => {
    const cleaned = fieldName
      .replace(/_page_\d+$/i, '')
      .replace(/[_\s]page\s*\d+$/i, '')
      .replace(/\s+page\s+\d+$/i, '');

    return cleaned
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\b\w+/g, word => {
        const specialCases: { [key: string]: string } = {
          'Up': 'UP',
          'Dob': 'Date of Birth',
          'No': 'Number',
          'Ut': 'UT',
          'Pincode': 'PIN Code',
          'Email': 'Email Address',
          'Mobile': 'Mobile Number'
        };
        return specialCases[word] || word;
      });
  };

  /**
   * Get current field value (edited or original)
   */
  const getCurrentFieldValue = (sectionKey: string, fieldKey: string, originalValue: any) => {
    return editedData[sectionKey]?.[fieldKey] ?? originalValue ?? '';
  };

  // ============================================================================
  // RENDERING FUNCTIONS
  // ============================================================================

  /**
   * Format cell values for display
   */
  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return 'Not specified';
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return 'No data';
        }
        return `Array of ${value.length} item${value.length !== 1 ? 's' : ''}`;
      } else {
        const entries = Object.entries(value);
        if (entries.length === 0) {
          return 'Empty object';
        }
        return entries.map(([key, val]) => {
          const formattedKey = formatFieldName(key);
          const formattedVal = isPrimitive(val) ? String(val) : '...';
          return `${formattedKey}: ${formattedVal}`;
        }).join(', ');
      }
    }

    return String(value);
  };

  /**
   * Render field values (for non-table fields)
   */
  const renderFieldValue = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined) {
      return 'Not specified';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return 'No data';
        }

        if (value.every(item => typeof item === 'object' && item !== null)) {
          return (
            <div className="space-y-2">
              {value.map((item, index) => (
                <div key={index} className="border-l-2 border-l-gray-300 pl-3">
                  <div className="space-y-1">
                    {Object.entries(item as Record<string, unknown>).map(([key, val]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium text-gray-700">{formatFieldName(key)}:</span>{' '}
                        <span className="text-gray-900">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        } else {
          return value.join(', ');
        }
      } else {
        return (
          <div className="space-y-1">
            {Object.entries(value).map(([key, val]) => (
              <div key={key} className="text-sm">
                <span className="font-medium text-gray-700">{formatFieldName(key)}:</span>{' '}
                <span className="text-gray-900">{String(val)}</span>
              </div>
            ))}
          </div>
        );
      }
    }

    return String(value);
  };

  // ============================================================================
  // MAIN RENDERING LOGIC
  // ============================================================================

  // Internal fields to exclude from rendering (used for bank statement processing logic)
  const internalFieldPatterns = [
    /^page_summary/i,
    /^other_content/i,
    /^document_type/i,
    /^page_number/i,
    /^is_continuation/i,
    /^is_first_page/i,
    /^has_signature/i,
    /^_table_headers/i,
  ];
  
  const isInternalField = (key: string): boolean => {
    // Remove page suffix for matching (e.g., "page_summary_page_3" -> "page_summary")
    const keyWithoutPageSuffix = key.replace(/_page_\d+$/i, '');
    return internalFieldPatterns.some(pattern => pattern.test(keyWithoutPageSuffix) || pattern.test(key));
  };

  if (!hierarchicalData || typeof hierarchicalData !== 'object' || Array.isArray(hierarchicalData)) {
    return null;
  }

  const orderedKeys = hierarchicalData._keyOrder || Object.keys(hierarchicalData).filter((k: string) => !k.startsWith('_'));
  const fields = orderedKeys
    .filter((key: string) => hierarchicalData.hasOwnProperty(key) && !key.startsWith('_') && !isInternalField(key) && !key.toLowerCase().startsWith('has_'))
    .map((key: string, index: number) => ({
      id: `field_${index}`,
      label: key,
      value: hierarchicalData[key],
      confidence: 0.85,
      type: Array.isArray(hierarchicalData[key]) && hierarchicalData[key].length > 0 && typeof hierarchicalData[key][0] === 'object' ? 'table' : 'text'
    }));

  // Process fields and organize them
  const sectionsMap: {
    [key: string]: {
      title: string;
      icon: React.ReactNode;
      fields: Array<{ name: string; originalName?: string; value: any }>;
      subsections?: Array<{ 
        title: string; 
        fields: Array<{ name: string; originalName?: string; value: any }>;
        isTable?: boolean;
        tableData?: Array<Record<string, unknown>>;
        tableHeaders?: string[];
      }>;
      isTable?: boolean;
      isGroupedTable?: boolean;
      tableData?: Array<Record<string, any>>;
      tableHeaders?: string[];
      groupedHeaders?: Array<{ name: string; colspan: number; subHeaders: string[] }>;
      isSignature?: boolean;
      signatureData?: any[];
    }
  } = {};

  // Process fields
  let fieldsToProcess = fields;
  if (hierarchicalData && typeof hierarchicalData === 'object' && !Array.isArray(hierarchicalData)) {
    const orderedKeys = hierarchicalData._keyOrder || Object.keys(hierarchicalData).filter(k => !k.startsWith('_'));
    fieldsToProcess = orderedKeys
      .filter(key => {
        const normalizedKey = key.toLowerCase().replace(/[_\s]/g, '');
        // Filter out image_size and internal processing fields
        if (normalizedKey === 'imagesize' || isInternalField(key)) {
          return false;
        }
        // Filter out has_* metadata fields (has_photo_id, has_signature, etc.)
        if (key.toLowerCase().startsWith('has_')) {
          return false;
        }
        return true;
      })
      .map(key => {
        const field = fields.find(f => (f.label || f.name) === key);
        return field || { label: key, value: hierarchicalData[key], confidence: 0.85 };
      })
      .filter(f => f !== undefined);
  }

  fieldsToProcess.forEach((field: any) => {
    const sectionName = field.label || field.name || field.field || 'Unknown Section';

    const normalizedOriginalName = sectionName.toLowerCase().replace(/[_\s]/g, '').replace(/page\d+/g, '');
    if (normalizedOriginalName === 'imagesize' || normalizedOriginalName === 'imagesizepage') {
      return;
    }

    const rawValue = field.value || field.valueText || '';
    const parsedValue = typeof rawValue === 'string' ? parseFieldValue(rawValue) : rawValue;

    const sectionKey = sectionName;
    const formattedSectionName = formatFieldName(sectionName);

    const normalizedFormattedName = formattedSectionName.toLowerCase().replace(/[_\s]/g, '');
    if (normalizedFormattedName === 'imagesize') {
      return;
    }

    if (typeof parsedValue === 'object' && parsedValue !== null && !Array.isArray(parsedValue)) {
      const objectEntries = Object.entries(parsedValue);

      // Check for nested grouped table structure
      if (objectEntries.length > 1) {
        const allAreArrays = objectEntries.every(([_, value]) => Array.isArray(value));
        if (allAreArrays) {
          const firstArray = objectEntries[0][1] as any[];
          if (firstArray.length > 0 && typeof firstArray[0] === 'object' && firstArray[0] !== null) {
            const firstArrayKeys = Object.keys(firstArray[0]).sort();
            const hasUniformStructure = objectEntries.every(([_, arr]) => {
              const arrArray = arr as any[];
              return arrArray.length > 0 &&
                arrArray.every(item =>
                  typeof item === 'object' && item !== null &&
                  Object.keys(item).sort().join(',') === firstArrayKeys.join(',')
                );
            });

            const commonKey = firstArrayKeys.find(key =>
              ['fy', 'year', 'period', 'date', 'time_period'].includes(key.toLowerCase()) ||
              key.toLowerCase().includes('year') ||
              key.toLowerCase().includes('period')
            ) || firstArrayKeys[0];

            if (hasUniformStructure && commonKey) {
              const groupedTableData: any[] = [];
              const allGroupKeys = objectEntries.map(([key, _]) => key);
              const allSubHeaders = firstArrayKeys.filter(k => k !== commonKey);
              const commonKeyValues = new Set<string>();

              objectEntries.forEach(([_, arr]) => {
                (arr as any[]).forEach(item => {
                  if (item[commonKey]) {
                    commonKeyValues.add(String(item[commonKey]));
                  }
                });
              });

              Array.from(commonKeyValues).forEach(commonValue => {
                const mergedRow: any = { [commonKey]: commonValue };

                objectEntries.forEach(([groupKey, arr]) => {
                  const matchingItem = (arr as any[]).find(item => String(item[commonKey]) === commonValue);
                  if (matchingItem) {
                    allSubHeaders.forEach(subHeader => {
                      mergedRow[`${groupKey}_${subHeader}`] = matchingItem[subHeader];
                    });
                  } else {
                    allSubHeaders.forEach(subHeader => {
                      mergedRow[`${groupKey}_${subHeader}`] = null;
                    });
                  }
                });

                groupedTableData.push(mergedRow);
              });

              const groupedHeaders = [
                { name: commonKey, colspan: 1, subHeaders: [] },
                ...allGroupKeys.map(groupKey => ({
                  name: groupKey,
                  colspan: allSubHeaders.length,
                  subHeaders: allSubHeaders
                }))
              ];

              if (!sectionsMap[sectionKey]) {
                sectionsMap[sectionKey] = {
                  title: formattedSectionName,
                  icon: getSectionIcon(sectionName),
                  fields: [],
                  subsections: []
                };
              }
              const section = sectionsMap[sectionKey];
              section.isTable = true;
              section.isGroupedTable = true;
              section.tableData = groupedTableData;
              section.tableHeaders = [commonKey, ...allGroupKeys.flatMap(gk => allSubHeaders.map(sh => `${gk}_${sh}`))];
              section.groupedHeaders = groupedHeaders;
              return;
            }
          }
        }
      }

      // Check if this is a column-based table structure
      if (isColumnBasedTable(parsedValue)) {
        const rowBasedData = convertColumnBasedToRowBased(parsedValue);
        if (!sectionsMap[sectionKey]) {
          sectionsMap[sectionKey] = {
            title: formattedSectionName,
            icon: getSectionIcon(sectionName),
            fields: [],
            subsections: []
          };
        }
        const section = sectionsMap[sectionKey];
        section.isTable = true;
        section.tableData = rowBasedData;
        section.tableHeaders = Object.keys(parsedValue);
        return;
      }

      // Check for nested object table structure
      const nestedObjectEntries = Object.entries(parsedValue);
      if (nestedObjectEntries.length > 0) {
        const allValuesAreObjects = nestedObjectEntries.every(([_, value]) =>
          typeof value === 'object' && value !== null && !Array.isArray(value)
        );

        if (allValuesAreObjects && nestedObjectEntries.length >= 2) {
          const firstNestedObject = nestedObjectEntries[0][1] as Record<string, any>;
          const firstNestedKeys = Object.keys(firstNestedObject).sort();
          const hasUniformNestedStructure = nestedObjectEntries.every(([_, value]) => {
            const nestedObj = value as Record<string, any>;
            return Object.keys(nestedObj).sort().join(',') === firstNestedKeys.join(',');
          });

          if (hasUniformNestedStructure && firstNestedKeys.length >= 2) {
            const tableRows = nestedObjectEntries.map(([rowKey, rowData]) => {
              const rowDataObj = rowData as Record<string, any>;
              const isMeaningfulRowKey = !/^(row|item|entry|record)[_\s]?\d+$/i.test(rowKey);
              if (isMeaningfulRowKey) {
                return {
                  _rowKey: rowKey,
                  ...rowDataObj
                };
              }
              return rowDataObj;
            });

            if (!sectionsMap[sectionKey]) {
              sectionsMap[sectionKey] = {
                title: formattedSectionName,
                icon: getSectionIcon(sectionName),
                fields: [],
                subsections: []
              };
            }
            const section = sectionsMap[sectionKey];
            section.isTable = true;
            section.tableData = tableRows;
            section.tableHeaders = tableRows[0]?._rowKey
              ? ['_rowKey', ...firstNestedKeys]
              : firstNestedKeys;
            return;
          }
        }
      }

      // Regular nested object handling
      if (!sectionsMap[sectionKey]) {
        sectionsMap[sectionKey] = {
          title: formattedSectionName,
          icon: getSectionIcon(sectionName),
          fields: [],
          subsections: []
        };
      }

      const section = sectionsMap[sectionKey];

      Object.entries(parsedValue).forEach(([key, value]) => {
        if (isSectionTitleKey(key)) return;
        if (key.startsWith('_')) return;

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const subsectionFields: Array<{ name: string; originalName?: string; value: any }> = [];
          Object.entries(value).forEach(([subKey, subValue]) => {
            if (isSectionTitleKey(subKey)) return;
            if (subKey.startsWith('_')) return;
            subsectionFields.push({
              name: formatFieldName(subKey),
              originalName: subKey,
              value: subValue
            });
          });

          section.subsections = section.subsections || [];
          section.subsections.push({
            title: formatFieldName(key),
            fields: subsectionFields
          });
        } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          // Check if this nested array is tabular data (e.g., "table": [...])
          const isTabularNested = arrayOfObjectsWithSameKeys(value);
          
          if (isTabularNested) {
            // Get union of all keys from all items
            const allKeysSet = new Set<string>();
            value.forEach((item: Record<string, unknown>) => {
              Object.keys(item).forEach(k => allKeysSet.add(k));
            });
            const tableHeaders = Array.from(allKeysSet);
            
            // Create a nested table subsection
            section.subsections = section.subsections || [];
            section.subsections.push({
              title: formatFieldName(key),
              fields: [],
              isTable: true,
              tableData: value,
              tableHeaders: tableHeaders
            });
          } else {
            // Non-tabular array - render as individual items
            section.subsections = section.subsections || [];
            value.forEach((item, idx) => {
              const itemFields: Array<{ name: string; originalName?: string; value: unknown }> = [];
              if (typeof item === 'object' && item !== null) {
                Object.entries(item).forEach(([subKey, subValue]) => {
                  if (!subKey.startsWith('_')) {
                    itemFields.push({
                      name: formatFieldName(subKey),
                      originalName: subKey,
                      value: subValue
                    });
                  }
                });
              }
              section.subsections!.push({
                title: `${formatFieldName(key)} ${idx + 1}`,
                fields: itemFields
              });
            });
          }
        } else {
          section.fields.push({
            name: formatFieldName(key),
            originalName: key,
            value: value
          });
        }
      });
    } else if (Array.isArray(parsedValue)) {
      if (!sectionsMap[sectionKey]) {
        sectionsMap[sectionKey] = {
          title: formattedSectionName,
          icon: getSectionIcon(sectionName),
          fields: [],
          subsections: []
        };
      }
      const section = sectionsMap[sectionKey];

      if (parsedValue.length > 0 && typeof parsedValue[0] === 'object') {
        // Check if this is signature data first
        const isSignatureData = parsedValue.every(item =>
          item && typeof item === 'object' && 'image_base64' in item
        );

        if (isSignatureData) {
          section.isSignature = true;
          section.signatureData = parsedValue;
        } else {
          // Check if it's tabular data
          const isTabularData = arrayOfObjectsWithSameKeys(parsedValue);

          if (isTabularData) {
            const firstItem = parsedValue[0];
            const columnCount = Object.keys(firstItem).length;
            const hasMultipleColumns = columnCount >= 2;

            if (hasMultipleColumns) {
              const hasNestedObjects = Object.values(firstItem).some(val =>
                typeof val === 'object' && val !== null && !Array.isArray(val)
              );

              if (hasNestedObjects) {
                let columnOrder = findColumnOrder(hierarchicalData, sectionKey);

                console.log('🔍 Column order lookup:', {
                  sectionKey,
                  foundInHierarchicalData: !!columnOrder,
                  columnOrder: columnOrder || 'not found',
                  metadataKeys: Object.keys(hierarchicalData).filter(k => k.includes('columnOrder'))
                });

                if (!columnOrder || columnOrder.length === 0) {
                  const nestedOrder = findColumnOrder(parsedValue, sectionKey);
                  if (nestedOrder) {
                    columnOrder = nestedOrder;
                  }
                }

                let orderedColumns: string[];
                if (Array.isArray(columnOrder) && columnOrder.length > 0) {
                  orderedColumns = columnOrder.filter((col: string) => col in firstItem);
                  const orderedSet = new Set(orderedColumns);
                  Object.keys(firstItem).forEach(col => {
                    if (!orderedSet.has(col)) {
                      orderedColumns.push(col);
                    }
                  });
                } else {
                  orderedColumns = Object.keys(firstItem);
                }

                const finalOrderedColumns = orderedColumns;

                console.log('✅ Final ordered columns:', finalOrderedColumns);

                const flatHeaders: string[] = [];
                const groupedHeaders: Array<{ name: string; colspan: number; subHeaders: string[] }> = [];

                finalOrderedColumns.forEach((key) => {
                  const value = firstItem[key];
                  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    const subKeys = Object.keys(value);
                    if (subKeys.length > 0) {
                      groupedHeaders.push({
                        name: key,
                        colspan: subKeys.length,
                        subHeaders: subKeys
                      });
                      subKeys.forEach(subKey => {
                        flatHeaders.push(`${key}_${subKey}`);
                      });
                    }
                  } else {
                    flatHeaders.push(key);
                    groupedHeaders.push({
                      name: key,
                      colspan: 1,
                      subHeaders: []
                    });
                  }
                });

                const flatTableData = parsedValue.map((item: any) => {
                  const flatRow: any = {};

                  finalOrderedColumns.forEach((key) => {
                    const value = item[key];
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                      const subKeys = Object.keys(value);
                      subKeys.forEach(subKey => {
                        flatRow[`${key}_${subKey}`] = (value as any)[subKey];
                      });
                    } else {
                      flatRow[key] = value;
                    }
                  });

                  return flatRow;
                });

                section.isTable = true;
                section.isGroupedTable = true;
                section.tableData = flatTableData;
                section.tableHeaders = flatHeaders;
                section.groupedHeaders = groupedHeaders;
              } else {
                let columnOrder = findColumnOrder(hierarchicalData, sectionKey);

                console.log('🔍 Column order lookup (regular table):', {
                  sectionKey,
                  foundInHierarchicalData: !!columnOrder,
                  columnOrder: columnOrder || 'not found',
                  metadataKeys: Object.keys(hierarchicalData).filter(k => k.includes('columnOrder'))
                });

                if (!columnOrder || columnOrder.length === 0) {
                  const nestedOrder = findColumnOrder(parsedValue, sectionKey);
                  if (nestedOrder) {
                    columnOrder = nestedOrder;
                  }
                }

                let tableHeaders: string[];
                if (Array.isArray(columnOrder) && columnOrder.length > 0) {
                  // Get union of all keys from all items (since items may have different keys)
                  const allKeysSet = new Set<string>();
                  parsedValue.forEach((item: Record<string, unknown>) => {
                    Object.keys(item).forEach(k => allKeysSet.add(k));
                  });
                  
                  tableHeaders = columnOrder.filter((col: string) => allKeysSet.has(col));
                  const orderedSet = new Set(tableHeaders);
                  allKeysSet.forEach(col => {
                    if (!orderedSet.has(col)) {
                      tableHeaders.push(col);
                    }
                  });
                } else {
                  // Get union of all keys from all items
                  const allKeysSet = new Set<string>();
                  parsedValue.forEach((item: Record<string, unknown>) => {
                    Object.keys(item).forEach(k => allKeysSet.add(k));
                  });
                  tableHeaders = Array.from(allKeysSet);
                }

                const finalTableHeaders = tableHeaders;

                console.log('✅ Final ordered headers:', finalTableHeaders);

                section.isTable = true;
                section.tableData = parsedValue;
                section.tableHeaders = finalTableHeaders;
              }
            } else {
              parsedValue.forEach((item, idx) => {
                const subsectionFields: Array<{ name: string; originalName?: string; value: any }> = [];
                Object.entries(item as Record<string, any>).forEach(([k, v]) => {
                  if (isSectionTitleKey(k)) return;
                  if (k.startsWith('_')) return;
                  subsectionFields.push({
                    name: formatFieldName(k),
                    originalName: k,
                    value: v
                  });
                });
                section.subsections?.push({
                  title: `Item ${idx + 1}`,
                  fields: subsectionFields
                });
              });
            }
          } else {
            parsedValue.forEach((item, idx) => {
              // Skip null/undefined items that might come from malformed JSON
              if (!item || typeof item !== 'object') {
                console.warn(`Skipping invalid item at index ${idx}:`, item);
                return;
              }
              const subsectionFields: Array<{ name: string; originalName?: string; value: any }> = [];
              Object.entries(item as Record<string, any>).forEach(([k, v]) => {
                if (isSectionTitleKey(k)) return;
                subsectionFields.push({
                  name: formatFieldName(k),
                  originalName: k,
                  value: v
                });
              });
              section.subsections?.push({
                title: `Item ${idx + 1}`,
                fields: subsectionFields
              });
            });
          }
        }
      } else {
        section.fields.push({
          name: formattedSectionName,
          originalName: sectionName,
          value: parsedValue.join(', ')
        });
      }
    } else {
      // Flat object (single record) with multiple primitive fields -> render as single-row table
      if (isPlainObject(parsedValue)) {
        const entries = Object.entries(parsedValue as Record<string, any>);
        const allPrimitive = entries.every(([_, v]) => isPrimitive(v));
        const hasEnoughColumns = entries.length >= 3;

        if (allPrimitive && hasEnoughColumns) {
          if (!sectionsMap[sectionKey]) {
            sectionsMap[sectionKey] = {
              title: formattedSectionName,
              icon: getSectionIcon(sectionName),
              fields: [],
              subsections: []
            };
          }
          const section = sectionsMap[sectionKey];
          section.isTable = true;
          section.tableHeaders = entries.map(([k]) => k);
          section.tableData = [Object.fromEntries(entries)];
          return;
        }
      }

      // Simple value
      if (!sectionsMap[sectionKey]) {
        sectionsMap[sectionKey] = {
          title: formattedSectionName,
          icon: getSectionIcon(sectionName),
          fields: []
        };
      }

      sectionsMap[sectionKey].fields.push({
        name: formatFieldName(sectionName),
        originalName: sectionName,
        value: parsedValue
      });
    }
  });

  // Convert map to array while preserving order
  let sections: any[];
  if (hierarchicalData && typeof hierarchicalData === 'object' && !Array.isArray(hierarchicalData)) {
    let orderedKeys = hierarchicalData._keyOrder;
    if (!Array.isArray(orderedKeys) || orderedKeys.length === 0) {
      orderedKeys = Object.keys(hierarchicalData).filter(k => !k.startsWith('_') && !isInternalField(k));
      console.log('⚠️ No _keyOrder found in hierarchicalData, using Object.keys() order');
    } else {
      // Filter out internal fields from the key order
      orderedKeys = orderedKeys.filter((k: string) => !isInternalField(k));
      console.log('✅ Using _keyOrder for section sequence:', orderedKeys.slice(0, 5));
    }

    sections = orderedKeys
      .filter(key => hierarchicalData.hasOwnProperty(key))
      .map(key => sectionsMap[key])
      .filter(section => section !== undefined);

    const orderedKeysSet = new Set(orderedKeys);
    Object.entries(sectionsMap).forEach(([key, section]) => {
      if (!orderedKeysSet.has(key)) {
        sections.push(section);
        console.warn('⚠️ Section not in _keyOrder:', key);
      }
    });

    console.log(`✅ Rendered ${sections.length} sections in order`);
  } else {
    sections = Object.values(sectionsMap);
    console.log('⚠️ hierarchicalData is not an object, using sectionsMap order');
  }

  // ============================================================================
  // RENDER SECTIONS
  // ============================================================================

  return (
    <div className="space-y-6">
      {sections.map((section, sectionIndex) => {
        const sectionKey = section.title.toLowerCase().replace(/\s+/g, '_');
        return (
          <Card key={sectionIndex} className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {section.icon}
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Table Rendering */}
                {section.isTable && section.tableData && section.tableHeaders && (
                  <div className="overflow-x-auto w-full scrollbar-thin">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        {section.isGroupedTable && section.groupedHeaders ? (
                          <>
                            <tr className="bg-gray-100">
                              {section.groupedHeaders.map((groupHeader, idx) => (
                                <th key={idx} colSpan={groupHeader.colspan} className={`border border-gray-300 px-4 py-2 text-sm ${groupHeader.colspan > 1 ? 'text-center font-bold text-gray-800' : 'text-left font-semibold text-gray-700'} bg-gray-200`}>
                                  {formatFieldName(groupHeader.name)}
                                </th>
                              ))}
                            </tr>
                            {section.groupedHeaders.some((h: any) => h.colspan > 1) && (
                              <tr className="bg-gray-100">
                                {section.groupedHeaders.map((groupHeader, groupIdx) =>
                                  groupHeader.colspan === 1 ? (
                                    <th key={groupIdx} className="border border-gray-300 px-4 py-2 text-sm" style={{ visibility: 'hidden' }}>&nbsp;</th>
                                  ) : (
                                    groupHeader.subHeaders.map((subHeader, subIdx) => (
                                      <th key={`${groupIdx}-${subIdx}`} className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                                        {formatFieldName(subHeader)}
                                      </th>
                                    ))
                                  )
                                )}
                              </tr>
                            )}
                          </>
                        ) : (
                          <tr className="bg-gray-100">
                            {section.tableHeaders.map((header, headerIndex) => (
                              <th key={headerIndex} className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                                {formatFieldName(header === '_rowKey' ? 'Row' : header)}
                              </th>
                            ))}
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {section.tableData.map((row, rowIndex) => (
                          <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            {section.tableHeaders.map((header, cellIndex) => {
                              const cellValue = row[header];
                              if (header === '_rowKey' && row._rowKey) {
                                return (
                                  <td key={cellIndex} className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                                    {isEditingData ? (
                                      <input
                                        type="text"
                                        value={getCurrentFieldValue(sectionKey, `_rowKey_${rowIndex}`, row._rowKey)}
                                        onChange={(e) => onFieldChange(sectionKey, `_rowKey_${rowIndex}`, e.target.value)}
                                        className="w-full text-sm text-gray-900 bg-white border-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        placeholder="Enter row key"
                                      />
                                    ) : (
                                      formatFieldName(row._rowKey)
                                    )}
                                  </td>
                                );
                              }
                              return (
                                <td key={cellIndex} className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                                  {isEditingData ? (
                                    <input
                                      type="text"
                                      value={getCurrentFieldValue(sectionKey, `${header}_${rowIndex}`, cellValue || 'Not specified')}
                                      onChange={(e) => onFieldChange(sectionKey, `${header}_${rowIndex}`, e.target.value)}
                                      className="w-full text-sm text-gray-900 bg-white border-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                      placeholder={`Enter ${header}`}
                                    />
                                  ) : (
                                    formatCellValue(cellValue)
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Fields Rendering */}
                {section.fields.length > 0 && (
                  <div className="space-y-3">
                    {section.fields.map((field, fieldIndex) => (
                      <div key={fieldIndex} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                        <div className="md:col-span-1">
                          <label className="text-sm font-medium text-gray-600 block">{field.name}</label>
                        </div>
                        <div className="md:col-span-1">
                          {isEditingData ? (
                            <input
                              type="text"
                              value={getCurrentFieldValue(sectionKey, field.originalName || field.name, field.value)}
                              onChange={(e) => onFieldChange(sectionKey, field.originalName || field.name, e.target.value)}
                              className="w-full text-sm text-gray-900 bg-white p-2 rounded border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[2rem]"
                              placeholder={`Enter ${field.name}`}
                            />
                          ) : (
                            <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded border min-h-[2rem]">
                              {renderFieldValue(getCurrentFieldValue(sectionKey, field.originalName || field.name, field.value))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Signature Rendering */}
                {section.isSignature && section.signatureData && (
                  <div className="space-y-4">
                    {section.signatureData.map((signature: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border">
                        <img
                          src={String(signature.image_base64)}
                          alt={String(signature.label || `signature ${idx + 1}`)}
                          className="h-16 w-auto rounded border shadow-sm bg-white"
                        />
                        <div className="text-sm font-medium text-gray-700">
                          {formatFieldName(signature.label || `Signature ${idx + 1}`)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Face / Photo ID Rendering */}
                {section.isFace && section.faceData && (
                  <div className="space-y-4">
                    {section.faceData.map((face: { image_base64?: string; label?: string; confidence?: number }, idx: number) => (
                      <div key={idx} className="flex flex-col items-center gap-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
                        <div className="w-full flex justify-center">
                          <img
                            src={String(face.image_base64)}
                            alt={String(face.label || `photo ${idx + 1}`)}
                            className="rounded-lg border-2 border-white shadow-lg bg-white object-contain"
                            style={{ height: '280px', width: 'auto', maxWidth: '100%' }}
                          />
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-800">
                            {formatFieldName(face.label || `Photo ID ${idx + 1}`)}
                          </div>
                          {face.confidence && (
                            <div className="text-sm text-gray-500 mt-1">
                              Confidence: {(face.confidence * 100).toFixed(1)}%
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subsections Rendering */}
                {section.subsections && section.subsections.map((subsection, subIndex) => (
                  <div key={subIndex} className="border-l-2 border-l-gray-200 pl-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      {subsection.title}
                    </h4>
                    
                    {/* Render as table if subsection is tabular data */}
                    {subsection.isTable && subsection.tableData && subsection.tableHeaders ? (
                      <div className="overflow-x-auto w-full scrollbar-thin">
                        <table className="w-full border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-gray-100">
                              {subsection.tableHeaders.map((header, headerIndex) => (
                                <th key={headerIndex} className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                                  {formatFieldName(header === '_rowKey' ? 'Row' : header)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {subsection.tableData.map((row, rowIndex) => (
                              <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                {subsection.tableHeaders.map((header, cellIndex) => {
                                  const cellValue = row[header];
                                  if (header === '_rowKey' && row._rowKey) {
                                    return (
                                      <td key={cellIndex} className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                                        {isEditingData ? (
                                          <input
                                            type="text"
                                            value={getCurrentFieldValue(sectionKey, `_rowKey_${rowIndex}`, row._rowKey)}
                                            onChange={(e) => onFieldChange(sectionKey, `_rowKey_${rowIndex}`, e.target.value)}
                                            className="w-full text-sm text-gray-900 bg-white border-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                            placeholder="Enter row key"
                                          />
                                        ) : (
                                          formatFieldName(row._rowKey)
                                        )}
                                      </td>
                                    );
                                  }
                                  return (
                                    <td key={cellIndex} className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                                      {isEditingData ? (
                                        <input
                                          type="text"
                                          value={getCurrentFieldValue(sectionKey, `${header}_${rowIndex}`, cellValue || 'Not specified')}
                                          onChange={(e) => onFieldChange(sectionKey, `${header}_${rowIndex}`, e.target.value)}
                                          className="w-full text-sm text-gray-900 bg-white border-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                          placeholder={`Enter ${header}`}
                                        />
                                      ) : (
                                        formatCellValue(cellValue)
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      /* Render as fields if not tabular */
                      <div className="space-y-3">
                        {subsection.fields.map((field, fieldIndex) => (
                          <div key={fieldIndex} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                            <div className="md:col-span-1">
                              <label className="text-sm font-medium text-gray-600 block">{field.name}</label>
                            </div>
                            <div className="md:col-span-1">
                              {isEditingData ? (
                                <input
                                  type="text"
                                  value={getCurrentFieldValue(sectionKey, field.originalName || field.name, field.value)}
                                  onChange={(e) => onFieldChange(sectionKey, field.originalName || field.name, e.target.value)}
                                  className="w-full text-sm text-gray-900 bg-white p-2 rounded border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[2rem]"
                                  placeholder={`Enter ${field.name}`}
                                />
                              ) : (
                                <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded border min-h-[2rem]">
                                  {renderFieldValue(getCurrentFieldValue(sectionKey, field.originalName || field.name, field.value))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default DataRenderer;
