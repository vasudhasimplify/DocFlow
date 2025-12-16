# AI Reasoning Parameters for Quick Access

## Overview
The AI score is calculated using **4 weighted factors** with a maximum score of 1.0 (shown as 10.0 in UI).

---

## Scoring Components (Weighted)

### 1. **Access Frequency** (40% weight)
**What it measures**: How often you open this document

**Calculation**:
- Uses logarithmic scaling: `log(count + 1) / log(11)`
- 0 accesses = 0.0 score
- 10+ accesses = 1.0 score (perfect)
- Logarithmic means: 1 access = 0.3, 5 accesses = 0.7, 10 accesses = 1.0

**Reasoning phrases**:
- Score ≥ 0.7: "frequently accessed"
- Score ≥ 0.4: "regularly accessed"
- Score < 0.4: (not mentioned)

---

### 2. **Recency** (30% weight)
**What it measures**: How recently you accessed this document

**Calculation**:
- Exponential decay over 30 days: `1.0 - (days_ago / 30)`
- Accessed today = 1.0 score
- Accessed 7 days ago = ~0.77 score
- Accessed 15 days ago = 0.5 score
- Accessed 30+ days ago = ~0 score

**Reasoning phrases**:
- Score ≥ 0.8: "recently viewed"
- Score ≥ 0.5: "accessed this week"
- Score < 0.5: (not mentioned)

---

### 3. **Document Type Importance** (20% weight)
**What it measures**: How critical the document type is for business

**Score mapping**:
| Document Type | Score | Priority |
|--------------|-------|----------|
| Contract | 0.95 | Critical |
| Invoice | 0.90 | High |
| Agreement | 0.90 | High |
| Report | 0.80 | High |
| Presentation | 0.75 | Medium-High |
| Spreadsheet | 0.75 | Medium-High |
| PDF | 0.70 | Medium |
| Excel/Word | 0.65-0.70 | Medium |
| Images | 0.40 | Low |
| Text files | 0.50 | Default |

**Detection**: Checks `document_type`, `mime_type`, and `file_name` for keywords

**Reasoning phrases**:
- Score ≥ 0.85: "important {doc_type}" (e.g., "important contract")
- Score ≥ 0.70: "important document type"
- Score < 0.70: (not mentioned)

---

### 4. **Collaboration Activity** (10% weight)
**What it measures**: How much this document is shared with others

**Calculation**:
- Counts active share links + external shares
- 5+ shares = 1.0 score (normalized)
- Linear scaling: 1 share = 0.2, 2 shares = 0.4, etc.

**Reasoning phrases**:
- Score ≥ 0.6: "actively shared"
- Score ≥ 0.3: "shared document"
- Score < 0.3: (not mentioned)

---

## Final Score Calculation

```
Final Score = (Frequency × 0.4) + (Recency × 0.3) + (Type × 0.2) + (Collaboration × 0.1)
```

**Example Calculation**:
```
Document: "Invoice_2024.pdf"
- Frequency: 8 accesses → 0.85 score × 0.4 = 0.34
- Recency: 3 days ago → 0.90 score × 0.3 = 0.27
- Type: Invoice → 0.90 score × 0.2 = 0.18
- Collaboration: 2 shares → 0.40 score × 0.1 = 0.04

Final Score = 0.34 + 0.27 + 0.18 + 0.04 = 0.83 (8.3 in UI)
Reason: "Suggested: frequently accessed, recently viewed, important invoice, shared document"
```

---

## Reasoning Generation Logic

The AI combines all active factors into a human-readable sentence:

**Format**: `"Suggested: {factor1}, {factor2}, {factor3}"`

**Only includes factors above threshold**:
- Frequency mentions if ≥ 0.4
- Recency mentions if ≥ 0.5
- Type mentions if ≥ 0.7
- Collaboration mentions if ≥ 0.3

**Fallback**: If no factors qualify, shows "Based on your usage patterns"

---

## How to Improve AI Reasoning

### **Current Issues**:
1. ❌ Too generic: "Based on your usage patterns"
2. ❌ Limited context about WHY it's important
3. ❌ No temporal context (e.g., "tax season" or "end of month")

### **Proposed Improvements**:

**Add these factors**:
- **File Size**: Large files (presentations, reports) might be more important
- **Creation Date**: Documents created in last week might be active projects
- **Naming Patterns**: Files with keywords like "URGENT", "FINAL", "DRAFT"
- **Access Patterns**: Spike in recent access vs. consistent usage
- **User Context**: Time-based (work hours) or seasonal (tax season)

**Enhanced reasoning examples**:
- "Frequently accessed during business hours, important contract type"
- "Recent project file (created 3 days ago), actively shared with team"
- "Critical document (invoice), accessed 5x this week, deadline approaching"
- "High-priority presentation, shared with 3 colleagues, accessed today"

---

## Configuration

**Location**: `backend/app/services/quick_access_ai_service.py`

**Adjustable Parameters**:
```python
# Weights (must sum to 1.0)
FREQUENCY_WEIGHT = 0.4
RECENCY_WEIGHT = 0.3
TYPE_WEIGHT = 0.2
COLLABORATION_WEIGHT = 0.1

# Thresholds for reasoning phrases
FREQ_HIGH_THRESHOLD = 0.7   # "frequently accessed"
FREQ_MED_THRESHOLD = 0.4    # "regularly accessed"
RECENCY_HIGH = 0.8          # "recently viewed"
RECENCY_MED = 0.5           # "accessed this week"
TYPE_HIGH = 0.85            # "important {doc_type}"
TYPE_MED = 0.7              # "important document type"
COLLAB_HIGH = 0.6           # "actively shared"
COLLAB_MED = 0.3            # "shared document"
```

---

## Database Tables Used

1. **`documents`**: Document metadata (type, name, created_at)
2. **`quick_access`**: Stores access_count, last_accessed_at, ai_score, ai_reason
3. **`share_links`**: Active document shares
4. **`external_shares`**: External collaboration activity

---

## API Endpoints

- **Calculate scores**: `POST /api/v1/quick-access/calculate-scores/sync`
- **Get scores**: `GET /api/v1/quick-access/scores?min_score=0.5`
- **Reset scores**: `DELETE /api/v1/quick-access/scores`

---

## Recommendations

### **To Make Reasoning More Specific**:

1. **Add temporal context**:
   - "Accessed 8 times in past 3 days" vs "Accessed 8 times total"
   
2. **Add comparison context**:
   - "Accessed 3x more than your average document"
   
3. **Add project context**:
   - "Part of active project: Q4 Reports"
   
4. **Add deadline context**:
   - "Important document, deadline in 2 days"

5. **Add behavioral patterns**:
   - "You typically access this on Monday mornings"
   - "Always accessed before meetings"

Would you like me to implement any of these improvements?
