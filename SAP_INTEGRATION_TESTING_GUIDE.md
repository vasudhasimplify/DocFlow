# 🧪 SAP Integration Testing Guide

## ⚠️ **IMPORTANT: Do You Have SAP?**

### **Don't have SAP software?**
**→ You can SKIP this entire feature!** It's completely optional.

SAP Integration is only needed if:
- ✅ Your company uses SAP software (ERP, S/4HANA, etc.)
- ✅ You want approved documents to automatically sync to SAP
- ✅ Your IT team can provide SAP connection details

**If you don't use SAP:** Just disable this feature in Step 4 of workflow creation and continue. DocFlow works perfectly fine without it!

---

## ✅ What We've Implemented

**SAP-ONLY Integration** - Simplified UI with only SAP configuration fields.

---

## 📋 Configuration Required from Your IT Team

If you DO have SAP, get these details from your **IT/SAP team**:

### 1. **SAP Server URL (Base URL)**
```
Example: https://sap.yourcompany.com:8000/sap/opu/odata/sap/
```
- **This is THE SAME for all document types** (invoices, purchase orders, contracts)
- Your IT team will add the service name at the end (like `INVOICE_SRV/`)
- You only need ONE base URL for everything

### 2. **Document Type (We provide dropdown)**
```
Our UI has a dropdown with these options:
- Invoices          → Goes to SAP FI (Financial Accounting)
- Purchase Orders   → Goes to SAP MM (Materials Management)  
- Contracts         → Goes to SAP Contract Management
- Material Documents → Goes to SAP Inventory
- Sales Orders      → Goes to SAP Sales
- Delivery Notes    → Goes to SAP Shipping
```
- **You don't need to type this** - just select from dropdown
- The dropdown automatically knows which SAP module to use

### 3. **SAP Credentials**
```
- Username: Your SAP user account
- Password: Your SAP password
```
- OR API Key/Bearer Token (if your SAP uses token authentication)

### 4. **Field Mapping (WE Handle This!)**
```
✅ Our AI automatically extracts fields from documents:

For Invoices:
  - invoice_number
  - amount
  - vendor
  - date
  - currency

For Purchase Orders:
  - po_number
  - supplier
  - total
  - delivery_date
  - items

For Contracts:
  - contract_number
  - party_name
  - value
  - start_date
  - end_date
```

**You just need to map these to SAP field names:**
```
Example: Invoice Mapping (IT team provides SAP field names)

Our Field          → SAP Field (from IT)
invoice_number     → InvoiceNumber
amount             → TotalAmount
vendor             → VendorName
date               → DocumentDate
```

**How it works:**
1. User uploads invoice PDF
2. Our AI extracts: `invoice_number = "INV-2026-001"`
3. You mapped: `invoice_number` → `InvoiceNumber`
4. We send to SAP: `{"InvoiceNumber": "INV-2026-001"}`

**So YES, field mapping DOES work** - we extract fields automatically!

---

## 🧪 How to Test (2 Methods)

### **Method 1: Mock SAP Server (For Development Testing)**

If you don't have SAP access yet, use a mock server:

#### Step 1: Install Mock Server
```powershell
# Install json-server globally
npm install -g json-server

# Create mock SAP data file
New-Item -Path "mock-sap-server.json" -ItemType File -Value '{
  "Invoices": [],
  "PurchaseOrders": []
}'

# Start mock server
json-server --watch mock-sap-server.json --port 3001
```

#### Step 2: Configure in DocFlow
- **SAP Server URL**: `http://localhost:3001/`
- **Document Type**: Select "Invoices" from dropdown
- **Username**: `test_user` (mock server doesn't validate)
- **Password**: `test_pass`
- **Field Mapping** (optional for mock test):
  - `invoice_number` → `InvoiceNumber`
  - `amount` → `TotalAmount`

#### Step 3: Test Workflow
1. Create a workflow with SAP integration enabled
2. Upload a document
3. Approve through all steps
4. Check `http://localhost:3001/Invoices` - you should see the data!

---

### **Method 2: Real SAP Server (Production/Staging)**

#### Step 1: Get Credentials from IT Team

Ask your IT/SAP team for:
```
✅ SAP Server Base URL (same for all document types!)
   Example: https://sap.company.com:8000/sap/opu/odata/sap/

✅ SAP Username & Password

✅ SAP Field Names for your document type
   Example for invoices:
   - InvoiceNumber (what SAP calls invoice number)
   - TotalAmount (what SAP calls amount)
   - VendorName (what SAP calls vendor)
   - DocumentDate (what SAP calls date)
```

**Important:** The URL is the SAME for all types. SAP figures out where to send data based on the Document Type you select in our dropdown.

#### Step 2: Configure in DocFlow

1. Open DocFlow → Workflows → Create Workflow
2. Go to **Step 4: SAP Integration**
3. Toggle **Enable** switch
4. Fill in:
   - **SAP Server URL**: (from IT team - base URL only!)
     - Example: `https://sap.company.com:8000/sap/opu/odata/sap/`
   - **Document Type**: Select from dropdown
     - For invoices: Select "Invoices"
     - For purchase orders: Select "Purchase Orders"
   - Click **Show Authentication**
   - Enter **Username** and **Password**
5. Add **Field Mapping**:
   - Click "Add Field Mapping"
   - Left side: Our AI extracted field name (e.g., `invoice_number`)
   - Right side: SAP field name from IT team (e.g., `InvoiceNumber`)
   - Add more mappings as needed

#### Step 3: Test Workflow

1. **Create Workflow**:
   ```
   Name: Invoice Approval with SAP
   Trigger: Manual
   Steps: 
     - Finance Review (assign to finance@company.com)
     - Manager Approval (assign to manager@company.com)
   SAP Integration: ENABLED
   ```

2. **Upload Test Document**:
   - Upload a test invoice PDF
   - Start the workflow manually

3. **Approve Through Steps**:
   - Finance team approves
   - Manager approves

4. **Check SAP System**:
   - Log into SAP
   - Navigate to the module (e.g., FI for Invoices)
   - Check if the invoice data appeared automatically!

#### Step 4: Verify in DocFlow

Check the **Audit Log**:
1. Open the completed workflow instance
2. Go to **Audit Log** tab
3. Look for entry: `"action": "target_system_integration"`
4. Check the details:
   ```json
   {
     "system_type": "sap",
     "success": true,
     "message": "Data successfully sent to SAP",
     "timestamp": "2026-01-08T..."
   }
   ```

---

## 🔍 Debugging Failed Integration

If SAP integration fails, check:

### 1. **Backend Logs**
```powershell
# Check backend terminal output for errors
# Look for lines like:
❌ Target system integration failed: ...
```

### 2. **Audit Log in Database**
```sql
-- Check Supabase workflow_audit_log table
SELECT * FROM workflow_audit_log 
WHERE action = 'target_system_integration'
ORDER BY created_at DESC
LIMIT 5;
```

### 3. **Common Issues**

| Error | Cause | Solution |
|-------|-------|----------|
| `Connection refused` | SAP server URL wrong | Verify URL with IT team |
| `401 Unauthorized` | Wrong credentials | Check username/password |
| `404 Not Found` | Wrong Entity Set | Verify Entity Set name |
| `Timeout` | SAP server slow/down | Check with IT team |
| `500 Internal Server Error` | SAP field mapping wrong | Fix field names |

---

## 📊 Test Data Examples

### Example 1: Invoice Document

**Extracted Data** (from AI):
```json
{
  "invoice_number": "INV-2026-001",
  "vendor": "Dell Technologies",
  "amount": "10000.00",
  "date": "2026-01-08",
  "currency": "USD"
}
```

**Field Mapping**:
```
invoice_number → InvoiceNumber
vendor         → VendorName
amount         → TotalAmount
date           → DocumentDate
currency       → Currency
```

**Sent to SAP**:
```json
{
  "__metadata": {
    "type": "ZWORKFLOW.Invoices"
  },
  "InvoiceNumber": "INV-2026-001",
  "VendorName": "Dell Technologies",
  "TotalAmount": "10000.00",
  "DocumentDate": "2026-01-08",
  "Currency": "USD",
  "WorkflowId": "abc-123-...",
  "Status": "COMPLETED"
}
```

---

### Example 2: Purchase Order

**Extracted Data**:
```json
{
  "po_number": "PO-2026-055",
  "supplier": "Office Supplies Inc",
  "total": "5500.00",
  "delivery_date": "2026-02-15"
}
```

**Field Mapping**:
```
po_number      → PurchaseOrderNumber
supplier       → SupplierName
total          → TotalValue
delivery_date  → RequestedDeliveryDate
```

**Entity Set**: `PurchaseOrders` (goes to SAP MM module)

---

## ✅ Success Indicators

**Integration worked if you see:**

1. ✅ Green success message in audit log
2. ✅ `"success": true` in database
3. ✅ Data appears in SAP system
4. ✅ No error logs in backend terminal

---

## 🚀 Next Steps After Successful Test

1. **Train Your Team**:
   - Show Finance team how to create workflows with SAP integration
   - Explain that they just toggle the switch and enter IT-provided details

2. **Document Your Configuration**:
   - Keep a record of:
     - SAP Endpoint URL
     - Entity Sets for different document types
     - Field mappings

3. **Production Rollout**:
   - Test with 5-10 documents first
   - Verify data accuracy in SAP
   - Roll out to all users

---

## 📞 Who to Contact

| Issue | Contact |
|-------|---------|
| SAP URL/Credentials | IT/SAP Team |
| Field mapping | SAP Functional Consultant |
| Entity Set names | SAP Administrator |
| DocFlow integration not working | Your development team |

---

## 🎯 Quick Test Checklist

Before going live, test:

- [ ] Workflow creates successfully with SAP enabled
- [ ] Workflow completes and triggers integration
- [ ] Data appears in SAP within 30 seconds
- [ ] All required fields are mapped correctly
- [ ] Credentials work (401 error = bad credentials)
- [ ] Audit log shows success
- [ ] No errors in backend logs
- [ ] SAP team confirms data format is correct

---

## 💡 Pro Tips

1. **Start Simple**: Test with just 1-2 field mappings first
2. **Use Staging SAP**: Don't test directly on production SAP!
3. **Check SAP Logs**: Your SAP team can see incoming API calls
4. **Timeout**: Integration has 30-second timeout - SAP must respond within 30s
5. **Non-Blocking**: Workflow completes even if SAP integration fails (logged for review)

---

**Questions?** Contact your IT team for SAP connection details!
