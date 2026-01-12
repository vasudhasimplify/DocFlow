# SimplifyAI DocFlow - Module Test Cases

**Version:** 1.0  
**Date:** January 9, 2026  
**Purpose:** Comprehensive test cases for all modules and features

---

## Table of Contents
1. [Documents Module](#1-documents-module)
2. [Compare Module](#2-compare-module)
3. [Compliance Module](#3-compliance-module)
4. [Processing Module](#4-processing-module)
5. [Database Migration Module](#5-database-migration-module)
---
## 1. Documents Module

### 1.1 Document Upload

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| DOC-UP-001 | Upload single PDF document | 1. Navigate to SimplifyDrive<br>2. Click "Upload Documents" button<br>3. Select a PDF file<br>4. Wait for upload to complete | Document uploaded successfully, appears in document list with processing status | ☐ |
| DOC-UP-002 | Upload multiple documents | 1. Click Upload button<br>2. Select multiple files (PDF, DOCX, images)<br>3. Confirm upload | All documents uploaded and visible in list | ☐ |
| DOC-UP-003 | Drag and drop upload | 1. Drag files from desktop to upload area<br>2. Drop files | Files uploaded successfully | ☐ |
| DOC-UP-004 | Upload with RAG indexing enabled | 1. Upload document<br>2. Ensure "Enable RAG" checkbox is checked | Document indexed for AI search | ☐ |
| DOC-UP-005 | Upload with auto-classification | 1. Upload document<br>2. Enable "Auto-classification" option | Document type automatically detected | ☐ |
| DOC-UP-006 | Upload large file (>10MB) | 1. Select a large file<br>2. Upload | Progress indicator shows, file uploads successfully | ☐ |
| DOC-UP-007 | Upload unsupported file type | 1. Try to upload .exe or unsupported file | Error message displayed | ☐ |

### 1.2 Document Scan

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| DOC-SC-001 | Open scanner interface | 1. Click "Scan" button in SimplifyDrive | Scanner modal opens with configuration panel | ☐ |
| DOC-SC-002 | Detect available scanners | 1. Open scan interface<br>2. View scanner list | Available scanners listed (or demo scanner shown) | ☐ |
| DOC-SC-003 | Configure scan settings | 1. Select resolution (150/300/600 DPI)<br>2. Select color mode (Color/Grayscale/B&W)<br>3. Select paper size | Settings saved and applied | ☐ |
| DOC-SC-004 | Scan single page | 1. Click "Scan Single Page"<br>2. Wait for scan completion | Page scanned and thumbnail displayed | ☐ |
| DOC-SC-005 | Batch scan multiple pages | 1. Click "Start Batch Scan"<br>2. Scan multiple pages<br>3. Click "Stop" | All pages scanned and listed | ☐ |
| DOC-SC-006 | Preview scanned page | 1. Scan a page<br>2. Double-click thumbnail | Full preview opens in side panel | ☐ |
| DOC-SC-007 | Rotate scanned page | 1. Scan page<br>2. Select page<br>3. Click rotate button | Page rotates 90 degrees | ☐ |
| DOC-SC-008 | Delete scanned page | 1. Scan multiple pages<br>2. Select a page<br>3. Click delete | Page removed from batch | ☐ |
| DOC-SC-009 | Upload scanned batch | 1. Complete scanning<br>2. Enter filename<br>3. Click "Upload to SimplifyDrive" | Scanned document uploaded successfully | ☐ |
| DOC-SC-010 | Download scanned PDF | 1. Complete scanning<br>2. Click "Download as PDF" | PDF file downloaded | ☐ |

### 1.3 Smart Folders

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| DOC-SF-001 | View all smart folders | 1. Navigate to SimplifyDrive<br>2. View left sidebar | Smart folders section visible with folder list | ☐ |
| DOC-SF-002 | Create smart folder manually | 1. Click "+" button in Smart Folders<br>2. Enter name and criteria<br>3. Save | New smart folder created and visible | ☐ |
| DOC-SF-003 | Auto-organize documents | 1. Click "Auto-Organize Documents" button<br>2. Wait for processing | Documents organized into relevant smart folders | ☐ |
| DOC-SF-004 | Select smart folder | 1. Click on a smart folder | Documents matching criteria displayed | ☐ |
| DOC-SF-005 | View "All Documents" | 1. Click "All Documents" | All documents displayed regardless of folder | ☐ |
| DOC-SF-006 | Delete smart folder | 1. Click delete icon on folder<br>2. Confirm deletion | Folder removed, documents remain | ☐ |
| DOC-SF-007 | Edit smart folder criteria | 1. Click edit on folder<br>2. Modify criteria<br>3. Save | Folder criteria updated, documents re-organized | ☐ |
| DOC-SF-008 | Drag document to folder | 1. Drag document<br>2. Drop on smart folder | Document added to folder | ☐ |
| DOC-SF-009 | Browse media by type | 1. Click "Browse Files by Media" | Files filtered by media type | ☐ |

### 1.4 AI Document Organization

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| DOC-AI-001 | Enable AI Insights | 1. Toggle "AI Insights" button in header | AI panel appears with insights and recommendations | ☐ |
| DOC-AI-002 | View document insights | 1. Enable AI Insights<br>2. View insights panel | Document statistics and AI analysis displayed | ☐ |
| DOC-AI-003 | Auto-classify document | 1. Upload new document<br>2. Wait for processing | Document type automatically detected and assigned | ☐ |
| DOC-AI-004 | Generate AI tags | 1. View document details<br>2. Check AI-suggested tags | Tags with sparkle icon shown (AI-generated) | ☐ |
| DOC-AI-005 | View AI-generated title | 1. Select document<br>2. View document card | AI-generated title displayed | ☐ |
| DOC-AI-006 | View document summary | 1. Select document<br>2. View details | AI-generated summary visible | ☐ |
| DOC-AI-007 | View key topics | 1. Select document<br>2. View document list/grid | Key topics badges displayed | ☐ |

### 1.5 AI Recommendations

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| DOC-REC-001 | View AI recommendations | 1. Enable AI Insights<br>2. View recommendations panel | Recommendation cards displayed | ☐ |
| DOC-REC-002 | Tag untagged documents | 1. View "Tag Important Documents" recommendation<br>2. Click "Add Tags" | Tagging workflow initiated | ☐ |
| DOC-REC-003 | Organize pending documents | 1. View organization recommendation<br>2. Click "Auto-Organize" | Documents organized into folders | ☐ |
| DOC-REC-004 | Review action items | 1. View "Review Actions" recommendation<br>2. Click action button | Action items displayed | ☐ |
| DOC-REC-005 | High-priority recommendations | 1. Check recommendations list | High-priority (red border) items shown first | ☐ |

### 1.6 Search Bar and Filters

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| DOC-SR-001 | Basic text search | 1. Type keyword in search bar<br>2. Press Enter or wait | Matching documents displayed | ☐ |
| DOC-SR-002 | AI-powered semantic search | 1. Enter natural language query<br>2. Search | Semantically relevant results shown | ☐ |
| DOC-SR-003 | Filter by date | 1. Open filters<br>2. Select date range | Documents filtered by date | ☐ |
| DOC-SR-004 | Filter by file type | 1. Select file type filter<br>2. Choose PDF/DOCX/etc | Only selected file types shown | ☐ |
| DOC-SR-005 | Sort by name | 1. Click sort dropdown<br>2. Select "Name" | Documents sorted alphabetically | ☐ |
| DOC-SR-006 | Sort by date | 1. Select "Date" sort option | Documents sorted by creation date | ☐ |
| DOC-SR-007 | Sort by size | 1. Select "Size" sort option | Documents sorted by file size | ☐ |
| DOC-SR-008 | Sort by importance | 1. Select "Importance" sort option | Documents sorted by AI importance score | ☐ |
| DOC-SR-009 | Toggle sort order | 1. Click sort order button (asc/desc) | Sort direction reversed | ☐ |
| DOC-SR-010 | View quick filters | 1. Click search bar<br>2. View suggestions | Quick filters like "Invoices", "Contracts" shown | ☐ |

### 1.7 Statistics Card

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| DOC-ST-001 | View total documents count | 1. Navigate to SimplifyDrive | Total documents count displayed | ☐ |
| DOC-ST-002 | View processed documents | 1. Check statistics cards | Processed documents count shown | ☐ |
| DOC-ST-003 | View total storage size | 1. Check statistics | Total storage size displayed | ☐ |
| DOC-ST-004 | View average importance | 1. Check statistics | Average importance score shown | ☐ |
| DOC-ST-005 | View AI insights stats | 1. Enable AI Insights<br>2. View insights panel | AI analyzed count, reading time stats shown | ☐ |

### 1.8 Offline Mode / Cloud Symbol

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| DOC-OF-001 | View online status | 1. Check header | Cloud icon with green indicator (online) | ☐ |
| DOC-OF-002 | Detect offline mode | 1. Disconnect internet<br>2. View header | Cloud-off icon, offline banner displayed | ☐ |
| DOC-OF-003 | View offline documents count | 1. Check offline indicator | Offline document count shown | ☐ |
| DOC-OF-004 | View pending sync count | 1. Check sync indicator | Number of pending items displayed | ☐ |
| DOC-OF-005 | Manual sync trigger | 1. Click sync button<br>2. Wait for sync | Documents synced when online | ☐ |
| DOC-OF-006 | Access cached documents offline | 1. Go offline<br>2. Try accessing documents | Cached documents accessible | ☐ |
| DOC-OF-007 | Clear offline data | 1. Open offline panel<br>2. Click "Clear Offline Data" | Cached data cleared | ☐ |

---

## 2. Compare Module

### 2.1 Compare Versions

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| CMP-VR-001 | Access compare versions tab | 1. Navigate to Compare feature<br>2. Click "Compare Versions" tab | Version comparison interface displayed | ☐ |
| CMP-VR-002 | Select document for comparison | 1. Click "Choose a document"<br>2. Select from list | Document selected, versions loaded | ☐ |
| CMP-VR-003 | Select base version | 1. Open Base Version dropdown<br>2. Select version | Base version selected | ☐ |
| CMP-VR-004 | Select compare version | 1. Open Compare Version dropdown<br>2. Select different version | Compare version selected | ☐ |
| CMP-VR-005 | Execute version comparison | 1. Select both versions<br>2. Click "Compare Versions" | Comparison dialog opens with diff view | ☐ |
| CMP-VR-006 | View unified diff | 1. Complete comparison<br>2. Select "Unified" view | Changes shown in unified format | ☐ |
| CMP-VR-007 | View split diff | 1. Select "Split" view | Side-by-side comparison shown | ☐ |
| CMP-VR-008 | View inline diff | 1. Select "Inline" view | Inline comparison displayed | ☐ |
| CMP-VR-009 | Filter by change type | 1. In comparison view<br>2. Toggle Added/Removed/Modified filters | Only selected change types shown | ☐ |
| CMP-VR-010 | View change summary | 1. Complete comparison<br>2. View header stats | Added/Removed/Modified counts displayed | ☐ |
| CMP-VR-011 | Export comparison report | 1. Complete comparison<br>2. Click export button | JSON report downloaded | ☐ |

### 2.2 Compare Documents

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| CMP-DC-001 | Access compare documents tab | 1. Click "Compare Documents" tab | Document comparison interface shown | ☐ |
| CMP-DC-002 | Select first document | 1. Click "Choose first document"<br>2. Select from list | Document 1 selected and displayed | ☐ |
| CMP-DC-003 | Select second document | 1. Click "Choose second document"<br>2. Select different document | Document 2 selected | ☐ |
| CMP-DC-004 | Compare two documents | 1. Select both documents<br>2. Click "Compare Documents" | Comparison executed, results displayed | ☐ |
| CMP-DC-005 | View document info | 1. After selecting documents<br>2. View document cards | File name, size, type, date shown | ☐ |

### 2.3 AI Analysis

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| CMP-AI-001 | Access AI analysis tab | 1. Click "AI Analysis" tab | AI analysis interface displayed | ☐ |
| CMP-AI-002 | Select document for AI analysis | 1. Choose a document | Document selected, versions loaded | ☐ |
| CMP-AI-003 | Select versions for analysis | 1. Select base and compare versions | Both versions selected | ☐ |
| CMP-AI-004 | Run AI analysis | 1. Click "Run AI Analysis" | AI processes changes, analysis shown | ☐ |
| CMP-AI-005 | View AI summary | 1. Complete AI analysis<br>2. View results | AI-generated summary displayed | ☐ |
| CMP-AI-006 | View AI insights | 1. Check analysis results | Key insights, concerns, recommendations shown | ☐ |
| CMP-AI-007 | Cached analysis retrieval | 1. Run analysis on same versions again | Cached result returned (faster) | ☐ |
| CMP-AI-008 | Generate AI summary in comparison | 1. Complete version comparison<br>2. Click "Generate AI Summary" | AI summary added to comparison view | ☐ |

### 2.4 Comparison History

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| CMP-HI-001 | View comparison history | 1. Scroll to "Recent Comparisons" section | History list displayed | ☐ |
| CMP-HI-002 | Click history item | 1. Click on a history entry | Comparison details shown | ☐ |
| CMP-HI-003 | View AI badge | 1. Check history entries | AI analysis entries have special badge | ☐ |
| CMP-HI-004 | Delete history entry | 1. Click delete on history item<br>2. Confirm | Entry removed from history | ☐ |
| CMP-HI-005 | Clear all history | 1. Click "Clear All"<br>2. Confirm | All history cleared | ☐ |

---

## 3. Compliance Module

### 3.1 Compliance Dashboard

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| CL-DS-001 | Access compliance module | 1. Navigate to Compliance from menu | Compliance dashboard displayed | ☐ |
| CL-DS-002 | View compliance statistics | 1. Check dashboard stats | Total labels, violations, pending reviews | ☐ |
| CL-DS-003 | Filter by framework | 1. Select framework (GDPR/HIPAA/etc.) | Labels filtered by framework | ☐ |

### 3.2 GDPR Compliance

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| CL-GD-001 | View GDPR labels | 1. Filter by GDPR framework | GDPR-specific labels shown | ☐ |
| CL-GD-002 | Apply GDPR label | 1. Select document<br>2. Apply GDPR label | Label applied with requirements | ☐ |
| CL-GD-003 | View GDPR requirements | 1. Check label card | Retention, encryption requirements shown | ☐ |

### 3.3 HIPAA Compliance

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| CL-HP-001 | View HIPAA labels | 1. Filter by HIPAA framework | HIPAA labels displayed | ☐ |
| CL-HP-002 | Apply PHI label | 1. Apply HIPAA PHI label to document | Label with restrictions applied | ☐ |

### 3.4 SOX Compliance

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| CL-SX-001 | View SOX labels | 1. Filter by SOX framework | SOX compliance labels shown | ☐ |
| CL-SX-002 | Apply SOX audit trail | 1. Apply SOX label | Audit requirements configured | ☐ |

### 3.5 PCI-DSS Compliance

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| CL-PC-001 | View PCI-DSS labels | 1. Filter by PCI-DSS | PCI compliance labels shown | ☐ |
| CL-PC-002 | Apply card data label | 1. Apply PCI-DSS label | Encryption/access controls set | ☐ |

### 3.6 CCPA Compliance

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| CL-CC-001 | View CCPA labels | 1. Filter by CCPA framework | CCPA labels displayed | ☐ |
| CL-CC-002 | Apply CCPA label | 1. Apply CCPA consumer data label | California privacy requirements set | ☐ |

### 3.7 Labels Management

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| CL-LB-001 | View all labels | 1. Go to Labels tab | All compliance labels listed | ☐ |
| CL-LB-002 | Search labels | 1. Enter search term | Matching labels filtered | ☐ |
| CL-LB-003 | Create custom label | 1. Click "Create Label"<br>2. Fill form<br>3. Save | New label created | ☐ |
| CL-LB-004 | Edit label | 1. Click edit on label<br>2. Modify<br>3. Save | Label updated | ☐ |
| CL-LB-005 | Delete custom label | 1. Click delete<br>2. Confirm | Label removed (custom only) | ☐ |
| CL-LB-006 | View label documents | 1. Click on label card | Documents with label shown | ☐ |

### 3.8 Violations

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| CL-VL-001 | View violations tab | 1. Click "Violations" tab | Violations list displayed | ☐ |
| CL-VL-002 | Filter by severity | 1. Select severity filter | Violations filtered | ☐ |
| CL-VL-003 | View violation details | 1. Click on violation | Details panel opens | ☐ |
| CL-VL-004 | Resolve violation | 1. Click resolve<br>2. Enter notes<br>3. Submit | Violation marked resolved | ☐ |
| CL-VL-005 | View active violations | 1. Filter unresolved | Only active violations shown | ☐ |
| CL-VL-006 | View resolved violations | 1. Filter resolved | Historical violations shown | ☐ |

### 3.9 Audit Log

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| CL-AU-001 | View audit log | 1. Click "Audit" tab | Audit entries listed | ☐ |
| CL-AU-002 | Search audit entries | 1. Enter search term | Matching entries filtered | ☐ |
| CL-AU-003 | Filter by action type | 1. Select action filter | Entries filtered by type | ☐ |
| CL-AU-004 | Filter by date range | 1. Select date range | Entries filtered by date | ☐ |
| CL-AU-005 | Export audit log | 1. Click export button | CSV file downloaded | ☐ |
| CL-AU-006 | View entry details | 1. Click on audit entry | Full details displayed | ☐ |

### 3.10 Reports

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| CL-RP-001 | View reports tab | 1. Click "Reports" tab | Report types displayed | ☐ |
| CL-RP-002 | Generate summary report | 1. Select Summary Report<br>2. Click Generate | Report generated and displayed | ☐ |
| CL-RP-003 | Generate violations report | 1. Select Violations Report<br>2. Generate | Violations report shown | ☐ |
| CL-RP-004 | Generate audit trail report | 1. Select Audit Report<br>2. Generate | Full audit report created | ☐ |
| CL-RP-005 | Export report | 1. Generate report<br>2. Click Export | Report downloaded | ☐ |
| CL-RP-006 | Filter report by framework | 1. Select framework<br>2. Generate | Framework-specific report | ☐ |

---

## 4. Processing Module

### 4.1 Processing History

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| PR-HI-001 | View processing history | 1. Navigate to Processing History | History table displayed | ☐ |
| PR-HI-002 | Filter by status | 1. Select status filter (completed/failed/processing) | History filtered by status | ☐ |
| PR-HI-003 | View single document history | 1. Click "Single Documents" tab | Individual document processing shown | ☐ |
| PR-HI-004 | View bulk jobs history | 1. Click "Bulk Jobs" tab | Bulk processing jobs listed | ☐ |
| PR-HI-005 | View document details | 1. Click on history item | Processing details shown | ☐ |
| PR-HI-006 | Download processed document | 1. Click download button | Document downloaded | ☐ |
| PR-HI-007 | View extracted fields count | 1. Check history entry | Fields count displayed | ☐ |
| PR-HI-008 | View confidence score | 1. Check history entry | Extraction confidence shown | ☐ |
| PR-HI-009 | View error details | 1. Find failed item<br>2. View details | Error message displayed | ☐ |
| PR-HI-010 | Refresh history | 1. Click refresh button | History reloaded | ☐ |

### 4.2 Bulk Processing

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| PR-BK-001 | Create bulk job | 1. Navigate to Upload<br>2. Select Bulk mode<br>3. Configure job | Job created | ☐ |
| PR-BK-002 | View bulk job progress | 1. Start bulk job<br>2. View progress | Progress bar and counts shown | ☐ |
| PR-BK-003 | View job statistics | 1. Open job details | Total, processed, failed counts | ☐ |
| PR-BK-004 | View manual review queue | 1. Go to Manual Review | Items needing review listed | ☐ |
| PR-BK-005 | Review document in queue | 1. Select item in queue<br>2. Review and approve/reject | Item processed | ☐ |

### 4.3 Document Processing Statistics

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| PR-ST-001 | View processing statistics | 1. Check statistics panel | Total, success rate shown | ☐ |
| PR-ST-002 | View completed count | 1. Check stats | Completed documents count | ☐ |
| PR-ST-003 | View failed count | 1. Check stats | Failed documents count | ☐ |
| PR-ST-004 | View processing count | 1. Check stats | Currently processing count | ☐ |
| PR-ST-005 | View success rate | 1. Check stats | Success rate percentage | ☐ |

---

## 5. Database Migration Module

### 5.1 Migration Dashboard

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| MG-DS-001 | Access migration dashboard | 1. Navigate to Migration feature | Dashboard displayed | ☐ |
| MG-DS-002 | View migration statistics | 1. Check dashboard stats | Total jobs, success rate shown | ☐ |
| MG-DS-003 | View recent migrations | 1. Check migration list | Recent jobs listed | ☐ |

### 5.2 Create Migration

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| MG-CR-001 | Create migration job | 1. Click "Create Migration"<br>2. Select source | Migration dialog opens | ☐ |
| MG-CR-002 | Select Google Drive source | 1. Choose Google Drive<br>2. Authenticate | Google Drive connected | ☐ |
| MG-CR-003 | Select OneDrive source | 1. Choose OneDrive<br>2. Authenticate | OneDrive connected | ☐ |
| MG-CR-004 | Configure migration options | 1. Select folders/files<br>2. Set options | Options configured | ☐ |
| MG-CR-005 | Start migration | 1. Click Start<br>2. Confirm | Migration job started | ☐ |

### 5.3 Migration Monitoring

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| MG-MN-001 | View migration progress | 1. Open migration job<br>2. View progress | Progress bar and stats shown | ☐ |
| MG-MN-002 | View migrated items | 1. Check migration details | Completed items listed | ☐ |
| MG-MN-003 | View failed items | 1. Check failures tab | Failed items with errors shown | ☐ |
| MG-MN-004 | Retry failed items | 1. Select failed items<br>2. Click retry | Items reprocessed | ☐ |
| MG-MN-005 | Cancel migration | 1. Click cancel<br>2. Confirm | Migration stopped | ☐ |

---

## Test Execution Summary

| Module | Total Tests | Passed | Failed | Blocked | Not Run |
|--------|-------------|--------|--------|---------|---------|
| Documents | 54 | | | | |
| Compare | 21 | | | | |
| Compliance | 36 | | | | |
| Processing | 15 | | | | |
| Migration | 10 | | | | |
| **TOTAL** | **136** | | | | |

---

## Test Environment

- **Frontend URL:** `http://localhost:5173`
- **Backend URL:** `http://localhost:8000`
- **Browser:** Chrome/Edge/Firefox (latest)
- **Test User:** (Configure test account)

## Notes

- Tests marked with ☐ are pending execution
- Tests marked with ✓ have passed
- Tests marked with ✗ have failed
- Tests marked with ⊘ are blocked

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-09 | 1.0 | Initial test cases created |
| 2026-01-11 | 1.1 | Added Shruti's test cases for sharing, metadata, e-signature, and audit modules |

---

# Shruti Test Cases

## 6. Share Links Module

### 6.1 Create Share Link

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| SL-CR-001 | Open Quick Share dialog | 1. Right-click document<br>2. Click "Share" or share icon | Quick Share dialog opens | ☐ |
| SL-CR-002 | Create basic share link | 1. Open Quick Share<br>2. Click "Create Link" | Share link generated with token | ☐ |
| SL-CR-003 | Create link with View Only permission | 1. Select "View Only" permission<br>2. Create link | Link created with view-only access | ☐ |
| SL-CR-004 | Create link with Download permission | 1. Select "Can Download" permission<br>2. Create link | Link allows file download | ☐ |
| SL-CR-005 | Create link with Edit permission | 1. Select "Can Edit" permission<br>2. Create link | Link allows document editing | ☐ |
| SL-CR-006 | Create password-protected link | 1. Enable "Password Protection"<br>2. Enter password<br>3. Create link | Link requires password to access | ☐ |
| SL-CR-007 | Create link with expiry date | 1. Set expiration date/time<br>2. Create link | Link expires at specified time | ☐ |
| SL-CR-008 | Create link with max views limit | 1. Set "Max Views" limit<br>2. Create link | Link disables after max views reached | ☐ |
| SL-CR-009 | Copy link to clipboard | 1. Create link<br>2. Click "Copy" button | Link copied, toast shown | ☐ |
| SL-CR-010 | Generate QR code for link | 1. Create link<br>2. Click QR code icon | QR code displayed | ☐ |

### 6.2 Share Links Dashboard

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| SL-DS-001 | View Share Links dashboard | 1. Navigate to Share Links tab | Dashboard with stats and links displayed | ☐ |
| SL-DS-002 | View total links count | 1. Check statistics cards | Active links count shown | ☐ |
| SL-DS-003 | View total views count | 1. Check statistics | Total views across all links displayed | ☐ |
| SL-DS-004 | Filter by Active links | 1. Click "Active" tab | Only active links shown | ☐ |
| SL-DS-005 | Filter by Expired links | 1. Click "Expired" tab | Only expired links shown | ☐ |
| SL-DS-006 | Filter by Revoked links | 1. Click "Revoked" tab | Only revoked links shown | ☐ |
| SL-DS-007 | Search links by name | 1. Enter search term | Matching links filtered | ☐ |
| SL-DS-008 | View link analytics | 1. Click on a link | Analytics panel opens with views, devices | ☐ |
| SL-DS-009 | Revoke share link | 1. Click revoke button<br>2. Confirm | Link marked as revoked, access disabled | ☐ |
| SL-DS-010 | Reactivate revoked link | 1. Find revoked link<br>2. Click reactivate | Link becomes active again | ☐ |

### 6.3 Share Link Settings

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| SL-ST-001 | Change permission level | 1. Open link settings<br>2. Change from Edit to View<br>3. Save | Permission updated, takes effect | ☐ |
| SL-ST-002 | Update expiry date | 1. Edit expiration<br>2. Set new date<br>3. Save | New expiry applied | ☐ |
| SL-ST-003 | Enable/disable download | 1. Toggle "Allow Download"<br>2. Save | Download permission changed | ☐ |
| SL-ST-004 | Enable access notifications | 1. Enable "Notify on Access"<br>2. Save | Owner gets notified when accessed | ☐ |
| SL-ST-005 | Update link name | 1. Change link name<br>2. Save | Name updated in dashboard | ☐ |

### 6.4 Share Link Analytics

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| SL-AN-001 | View total views | 1. Open analytics panel | Total views count displayed | ☐ |
| SL-AN-002 | View unique visitors | 1. Check analytics | Unique visitor count shown | ☐ |
| SL-AN-003 | View device breakdown | 1. Check device chart | Desktop/Mobile/Tablet breakdown shown | ☐ |
| SL-AN-004 | View download count | 1. Check analytics | Number of downloads displayed | ☐ |
| SL-AN-005 | View access history | 1. Scroll to access history | Recent accesses with timestamps shown | ☐ |
| SL-AN-006 | Real-time analytics update | 1. Access link from another device<br>2. Check analytics | View count increments | ☐ |

---

## 7. Guest Sharing Module

### 7.1 Create Guest Share

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| GS-CR-001 | Open guest share dialog | 1. Click "Share with Guest" | Guest sharing dialog opens | ☐ |
| GS-CR-002 | Enter guest email | 1. Enter guest's email address | Email validated | ☐ |
| GS-CR-003 | Enter guest name | 1. Enter guest's name | Name field populated | ☐ |
| GS-CR-004 | Select permission level | 1. Choose View/Comment/Edit | Permission selected | ☐ |
| GS-CR-005 | Add personal message | 1. Enter custom message | Message saved for email | ☐ |
| GS-CR-006 | Send guest invitation | 1. Click "Send Invitation" | Email sent to guest | ☐ |

### 7.2 Guest Access

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| GS-AC-001 | Guest opens invitation link | 1. Click link from email | Guest access page loads | ☐ |
| GS-AC-002 | Guest enters email (if required) | 1. Enter email to verify | Access granted after verification | ☐ |
| GS-AC-003 | Guest views document | 1. Access with view permission | Document displayed read-only | ☐ |
| GS-AC-004 | Guest downloads document | 1. Click download (if allowed) | Document downloaded | ☐ |
| GS-AC-005 | Guest edits document | 1. Access with edit permission<br>2. Make changes | Edits saved | ☐ |
| GS-AC-006 | Access denied for revoked share | 1. Try accessing revoked link | Access denied message shown | ☐ |
| GS-AC-007 | Access denied for expired share | 1. Try accessing expired link | Expired message shown | ☐ |

### 7.3 Guest Share Management

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| GS-MG-001 | View all guest shares | 1. Navigate to Guest Sharing tab | All guest shares listed | ☐ |
| GS-MG-002 | Resend invitation email | 1. Click resend on pending share | Email resent to guest | ☐ |
| GS-MG-003 | Revoke guest access | 1. Click revoke<br>2. Confirm | Guest access removed | ☐ |
| GS-MG-004 | Delete guest share | 1. Click delete<br>2. Confirm | Share record removed | ☐ |
| GS-MG-005 | View share status | 1. Check status badge | Pending/Accepted/Revoked shown | ☐ |

---

## 8. Access Rules Module

### 8.1 Access Rules Dashboard

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| AR-DS-001 | View access rules tab | 1. Navigate to Access Rules | Rules list displayed | ☐ |
| AR-DS-002 | View active rules count | 1. Check statistics | Active rules count shown | ☐ |
| AR-DS-003 | Filter by rule type | 1. Select rule type filter | Rules filtered | ☐ |

### 8.2 Create Access Rules

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| AR-CR-001 | Open create rule dialog | 1. Click "+ Create" button | Create rule dialog opens with Step 1 form | ☐ |
| AR-CR-002 | Enter rule name | 1. Enter name in "Rule Name" field | Name accepted (required field) | ☐ |
| AR-CR-003 | Enter rule description | 1. Enter description text | Description saved | ☐ |
| AR-CR-004 | Select file types to match | 1. Expand "Matching Criteria"\<br>2. Select file types (.pdf, .docx, .xlsx, etc.) | Selected types highlighted | ☐ |
| AR-CR-005 | Add name pattern (Regex) | 1. Enter pattern like "confidential"\<br>2. Click "Add" | Pattern added to list | ☐ |
| AR-CR-006 | Add content keywords | 1. Enter keywords like "SSN, credit card"\<br>2. Click "Add" | Keywords added for content matching | ☐ |
| AR-CR-007 | Enable Restrict Download | 1. Expand "Access Restrictions"\<br>2. Toggle "Restrict Download" ON | Download restriction enabled | ☐ |
| AR-CR-008 | Enable Restrict Print | 1. Toggle "Restrict Print" ON | Print restriction enabled | ☐ |
| AR-CR-009 | Enable Restrict Sharing | 1. Toggle "Restrict Sharing" ON | Internal sharing restriction enabled | ☐ |
| AR-CR-010 | Enable No External Share | 1. Toggle "No External Share" ON | External/guest sharing blocked | ☐ |
| AR-CR-011 | Create rule successfully | 1. Fill required fields\<br>2. Click "Create Rule" | Rule created and appears in list | ☐ |
| AR-CR-012 | Cancel rule creation | 1. Click "Cancel" | Dialog closes without saving | ☐ |

### 8.3 Manage Access Rules

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| AR-MG-001 | Enable/disable rule | 1. Toggle rule status | Rule activation changes | ☐ |
| AR-MG-002 | Edit existing rule | 1. Click edit<br>2. Modify<br>3. Save | Rule updated | ☐ |
| AR-MG-003 | Delete access rule | 1. Click delete<br>2. Confirm | Rule removed | ☐ |
| AR-MG-004 | View rule violations | 1. Check violations log | Access attempts blocked by rule shown | ☐ |

---

## 9. Custom Metadata Module

### 9.1 Create Metadata Field

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| MT-CR-001 | Open create field dialog | 1. Click "+ Add Field" button | Create Metadata Field dialog opens | ☐ |
| MT-CR-002 | Enter field label | 1. Enter label (e.g., "Client Name") | Label field populated (required) | ☐ |
| MT-CR-003 | Enter field description | 1. Enter optional description | Description saved | ☐ |
| MT-CR-004 | Create field successfully | 1. Click "Create Field" | Field created and appears in list | ☐ |

### 9.2 Add Documents to Field

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| MT-AD-001 | Open add documents dialog | 1. Click "..." menu on field<br>2. Select "Add Documents" | Add Documents to Field dialog opens | ☐ |
| MT-AD-002 | Search documents | 1. Type in search box | Documents filtered by name | ☐ |
| MT-AD-003 | Select documents | 1. Click checkbox next to documents | Documents selected | ☐ |
| MT-AD-004 | Add documents to field | 1. Click "Add to Field" | Documents assigned to metadata field | ☐ |

### 9.3 Edit Metadata Field

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| MT-ED-001 | Open edit dialog | 1. Click "..." menu<br>2. Select "Edit" | Edit field dialog opens | ☐ |
| MT-ED-002 | Update field label | 1. Change label text<br>2. Save | Label updated | ☐ |
| MT-ED-003 | Update description | 1. Change description<br>2. Save | Description updated | ☐ |

### 9.4 Add Metadata from Document Tab

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| MT-DT-001 | Open document properties | 1. Select document<br>2. Click Metadata button | Properties panel opens | ☐ |
| MT-DT-002 | Add metadata to document | 1. Select metadata field<br>2. Enter value | Metadata assigned to document | ☐ |

---

## 10. Watermarks Module

### 10.1 Watermark Configuration

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| WM-CF-001 | Access watermark settings | 1. Navigate to Watermarks tab | Watermark configuration displayed | ☐ |
| WM-CF-002 | Enable text watermark | 1. Toggle "Text Watermark" on<br>2. Enter text | Text watermark enabled | ☐ |
| WM-CF-003 | Set watermark position | 1. Select position (center/corner) | Position applied | ☐ |
| WM-CF-004 | Set watermark opacity | 1. Adjust opacity slider | Opacity changed | ☐ |
| WM-CF-005 | Set watermark color | 1. Select color | Color applied | ☐ |
| WM-CF-006 | Enable diagonal watermark | 1. Toggle diagonal option | Watermark rotates 45 degrees | ☐ |

### 10.2 Dynamic Watermarks

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| WM-DY-001 | Add user email to watermark | 1. Include {email} variable | Current user's email shown | ☐ |
| WM-DY-002 | Add date to watermark | 1. Include {date} variable | Current date shown | ☐ |
| WM-DY-003 | Add time to watermark | 1. Include {time} variable | Access time shown | ☐ |
| WM-DY-004 | Add document name | 1. Include {filename} variable | File name shown | ☐ |

### 10.3 Watermark Application

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| WM-AP-001 | Preview watermark | 1. Configure watermark<br>2. Click preview | Watermark shown on sample | ☐ |
| WM-AP-002 | Apply to share link | 1. Enable watermark for link | Guests see watermarked document | ☐ |
| WM-AP-003 | Watermark on download | 1. Enable watermark on download | Downloaded PDF has watermark | ☐ |
| WM-AP-004 | Watermark on print | 1. Enable watermark on print | Printed document has watermark | ☐ |

---

## 11. E-Signature Module

### 11.1 Request Signature

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ES-RQ-001 | Open signature request dialog | 1. Click "Request Signature" | E-sign dialog opens | ☐ |
| ES-RQ-002 | Add signer by email | 1. Enter signer email<br>2. Add to list | Signer added | ☐ |
| ES-RQ-003 | Add multiple signers | 1. Add 2+ signer emails | Multiple signers listed with order | ☐ |
| ES-RQ-004 | Set signing order | 1. Enable sequential signing<br>2. Arrange order | Order configured | ☐ |
| ES-RQ-005 | Add optional message | 1. Enter message for signer | Message saved | ☐ |
| ES-RQ-006 | Send signature request | 1. Click "Send Request" | Email sent to signer(s) | ☐ |

### 11.2 Signing Process

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ES-SG-001 | Signer opens signing link | 1. Click link from email | Signing page loads | ☐ |
| ES-SG-002 | View document before signing | 1. Review document content | Document displayed | ☐ |
| ES-SG-003 | Draw signature | 1. Use mouse/touch to draw | Signature captured | ☐ |
| ES-SG-004 | Type signature | 1. Type name<br>2. Select font | Typed signature generated | ☐ |
| ES-SG-005 | Upload signature image | 1. Upload signature file | Image signature added | ☐ |
| ES-SG-006 | Place signature on document | 1. Position signature | Signature placed at location | ☐ |
| ES-SG-007 | Add initials | 1. Draw/type initials | Initials added | ☐ |
| ES-SG-008 | Add date stamp | 1. Add date field | Date auto-filled | ☐ |
| ES-SG-009 | Complete signing | 1. Click "Finish Signing" | Document signed and saved | ☐ |
| ES-SG-010 | Decline to sign | 1. Click "Decline"<br>2. Enter reason | Request declined, owner notified | ☐ |

### 11.3 Signature Management

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| ES-MG-001 | View pending signatures | 1. Navigate to E-Sign tab<br>2. Check pending | Awaiting signatures listed | ☐ |
| ES-MG-002 | View completed signatures | 1. Check completed tab | Signed documents listed | ☐ |
| ES-MG-003 | Send reminder | 1. Click "Send Reminder" | Reminder email sent | ☐ |
| ES-MG-004 | Cancel signature request | 1. Click cancel<br>2. Confirm | Request cancelled | ☐ |
| ES-MG-005 | Download signed document | 1. Click download | Signed PDF downloaded | ☐ |
| ES-MG-006 | View signature certificate | 1. Click "View Certificate" | Certificate with timestamps shown | ☐ |

---

## 12. Audit Trail Module

### 12.1 Audit Dashboard

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| AU-DS-001 | Access audit trail | 1. Navigate to Audit Trail tab | Audit events displayed | ☐ |
| AU-DS-002 | View event timeline | 1. Check timeline view | Events shown chronologically | ☐ |
| AU-DS-003 | View event statistics | 1. Check stats cards | Event counts by type shown | ☐ |

### 12.2 Filter and Search

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| AU-FL-001 | Filter by event type | 1. Select event type (view/edit/share) | Events filtered | ☐ |
| AU-FL-002 | Filter by date range | 1. Select date range | Events filtered by date | ☐ |
| AU-FL-003 | Filter by user | 1. Select specific user | Only user's events shown | ☐ |
| AU-FL-004 | Filter by document | 1. Select document | Document's events shown | ☐ |
| AU-FL-005 | Search events | 1. Enter search term | Matching events displayed | ☐ |

### 12.3 Event Details

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| AU-EV-001 | View event details | 1. Click on event | Details panel opens | ☐ |
| AU-EV-002 | View user info | 1. Check event details | User email, name shown | ☐ |
| AU-EV-003 | View IP address | 1. Check event details | IP address logged | ☐ |
| AU-EV-004 | View timestamp | 1. Check event | Exact timestamp shown | ☐ |
| AU-EV-005 | View document link | 1. Click document name | Navigate to document | ☐ |

### 12.4 Export Audit

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| AU-EX-001 | Export as CSV | 1. Click "Export CSV" | CSV file downloaded | ☐ |
| AU-EX-002 | Export as PDF report | 1. Click "Export PDF" | PDF report generated | ☐ |
| AU-EX-003 | Export filtered results | 1. Apply filters<br>2. Export | Only filtered events exported | ☐ |

---

## 13. Migration Module (Extended)

### 13.1 Connect Cloud Storage

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| MG-CN-001 | Connect Google Drive | 1. Click "Connect Google"<br>2. Sign in<br>3. Grant permissions | Google Drive connected | ☐ |
| MG-CN-002 | Connect OneDrive | 1. Click "Connect OneDrive"<br>2. Sign in | OneDrive connected | ☐ |
| MG-CN-003 | Disconnect account | 1. Click disconnect | Account removed | ☐ |
| MG-CN-004 | View connected accounts | 1. Check credentials panel | Connected accounts listed | ☐ |

### 13.2 Create Migration Job

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| MG-JB-001 | Create migration job | 1. Click "Create Migration"<br>2. Fill details | Job created | ☐ |
| MG-JB-002 | Select source folder | 1. Browse folders<br>2. Select | Folder selected | ☐ |
| MG-JB-003 | Enable "Delete after migration" | 1. Toggle delete option | Files will be deleted from source | ☐ |
| MG-JB-004 | Set job name | 1. Enter descriptive name | Name saved | ☐ |
| MG-JB-005 | Start migration | 1. Click "Start" | Migration begins | ☐ |

### 13.3 Monitor Migration

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| MG-MN-001 | View migration progress | 1. Check job card | Progress bar and percentage shown | ☐ |
| MG-MN-002 | View file count | 1. Check job details | Files processed/total shown | ☐ |
| MG-MN-003 | View transfer speed | 1. Check metrics | KB/s or MB/s displayed | ☐ |
| MG-MN-004 | View completed files | 1. Expand job details | List of migrated files | ☐ |
| MG-MN-005 | View failed files | 1. Check failures tab | Failed files with error reasons | ☐ |
| MG-MN-006 | Pause migration | 1. Click pause button | Migration paused | ☐ |
| MG-MN-007 | Resume migration | 1. Click resume button | Migration continues | ☐ |
| MG-MN-008 | Cancel migration | 1. Click cancel<br>2. Confirm | Migration stopped | ☐ |

### 13.4 Identity Mapping

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| MG-ID-001 | View identity mappings | 1. Check Identity Mapping panel | Mappings listed | ☐ |
| MG-ID-002 | Create identity mapping | 1. Enter source email<br>2. Select target user<br>3. Save | Mapping created | ☐ |
| MG-ID-003 | Import mappings from CSV | 1. Click "Import CSV"<br>2. Upload file | Mappings imported | ☐ |
| MG-ID-004 | Export mappings | 1. Click "Export" | CSV downloaded | ☐ |
| MG-ID-005 | Delete mapping | 1. Click delete<br>2. Confirm | Mapping removed | ☐ |
| MG-ID-006 | Verify mapping | 1. Click verify | Mapping marked as verified | ☐ |

### 13.5 Permission Transfer Log

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| MG-PT-001 | View permission transfer log | 1. Navigate to log panel | Permission transfers listed | ☐ |
| MG-PT-002 | Filter by status | 1. Select success/failed | Log filtered | ☐ |
| MG-PT-003 | View transfer details | 1. Click on log entry | Details shown | ☐ |

---

## Test Execution Summary (Updated)

| Module | Total Tests | Passed | Failed | Blocked | Not Run |
|--------|-------------|--------|--------|---------|---------|
| Documents | 54 | | | | |
| Compare | 21 | | | | |
| Compliance | 36 | | | | |
| Processing | 15 | | | | |
| Migration (Basic) | 10 | | | | |
| **Share Links** | 25 | | | | |
| **Guest Sharing** | 12 | | | | |
| **Access Rules** | 12 | | | | |
| **Metadata** | 13 | | | | |
| **Watermarks** | 12 | | | | |
| **E-Signature** | 19 | | | | |
| **Audit Trail** | 14 | | | | |
| **Migration (Extended)** | 22 | | | | |
| **TOTAL** | **265** | | | | |

