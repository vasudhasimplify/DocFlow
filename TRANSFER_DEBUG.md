# Transfer Debugging Guide

## Check if transfer was accepted successfully:

1. Open browser console (F12)
2. Run this code:

```javascript
// Get current user
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user.id, user.email);

// Check transfers for this user
const { data: transfers } = await supabase
  .from('document_ownership_transfers')
  .select('*')
  .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
  .order('created_at', { ascending: false });
  
console.log('Transfers:', transfers);

// Check if the transferred document exists and who owns it
const transferId = transfers[0]?.id; // Use the latest transfer
const transfer = transfers[0];

if (transfer) {
  const { data: doc } = await supabase
    .from('documents')
    .select('id, file_name, user_id, uploaded_by')
    .eq('id', transfer.document_id)
    .single();
    
  console.log('Document details:', doc);
  console.log('Transfer status:', transfer.status);
  console.log('Document owner matches current user?', doc?.user_id === user.id);
}

// Check what documents the current user can see
const { data: myDocs } = await supabase
  .from('documents')
  .select('id, file_name, user_id')
  .or(`user_id.eq.${user.id},uploaded_by.eq.${user.id}`)
  .limit(10);
  
console.log('My documents:', myDocs);
```

## Expected Results:

1. **Transfer status should be**: `"accepted"`
2. **Document user_id should match**: Current user's ID
3. **Document should appear in "My documents"**

## If document still doesn't show:

The issue is likely with RLS policies. Run this to bypass RLS and check:

```sql
-- Run in Supabase Dashboard → SQL Editor
SELECT id, file_name, user_id, uploaded_by 
FROM documents 
WHERE id = 'DOCUMENT_ID_HERE';
```

## Quick Fix - Temporarily allow all document access:

If you need immediate access, you can temporarily make the policy more permissive.
