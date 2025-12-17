# 🧪 How to Test Check In/Out and Transfers Features

## Prerequisites

1. **Run the Database Migration** (Only once!)
   - Go to https://supabase.com/dashboard
   - Select your project
   - Click "SQL Editor" in left sidebar
   - Copy ALL the content from `supabase/migrations/20251217000001_create_checkinout_transfers.sql`
   - Paste it in the SQL editor
   - Click "RUN" button
   - ✅ You'll see "Success" message when tables are created

---

## 🔒 Testing Check In/Out Feature

### What It Does
**Check In/Out** is like checking out a library book - when you "check out" a document, you lock it so nobody else can edit it. When you're done, you "check in" to unlock it.

### Simple Testing Steps:

1. **Go to the Check In/Out Tab**
   - Open http://localhost:4173
   - Click "SimplifyDrive" in navigation
   - Find and click **"Check In/Out"** tab

2. **See Current Locks**
   - You'll see 3 tabs: "My Checkouts", "All Checkouts", "History"
   - Initially, all will be empty (no documents locked)

3. **Lock a Document**
   - Go back to "Documents" tab (same dashboard)
   - Find any document
   - Look for a "Lock" or "Check Out" button (need to add this in next step!)
   - Click it
   - Choose how long to lock it (default: 24 hours)
   - Optionally add a reason: "I'm editing this"

4. **Verify the Lock**
   - Go back to "Check In/Out" tab
   - Under "My Checkouts", you should see your locked document!
   - Shows: document name, when locked, when it expires

5. **Unlock a Document**
   - In "My Checkouts", find your locked document
   - Click "Check In" button
   - Document is now unlocked!

6. **See All Locks (Team View)**
   - Click "All Checkouts" tab
   - See ALL documents that anyone has locked
   - Helpful to see who's working on what

7. **Check History**
   - Click "History" tab
   - See all lock/unlock actions
   - Shows who locked/unlocked what and when

### What You Should See:
- ✅ Documents can be locked (checked out)
- ✅ Locked documents show who locked them
- ✅ Locks have expiration times
- ✅ You can unlock your own documents
- ✅ History shows all actions

---

## 📤 Testing Ownership Transfers Feature

### What It Does
**Transfers** let you give your document to someone else - like transferring ownership. They have to accept it first before they get it.

### Simple Testing Steps:

1. **Go to Transfers Tab**
   - Open http://localhost:4173
   - Click "SimplifyDrive"
   - Find and click **"Transfers"** tab

2. **See Current Transfers**
   - You'll see "Pending Transfers" and "Transfer History"
   - Initially empty

3. **Start a Transfer**
   - Go back to "Documents" tab
   - Find a document YOU OWN
   - Look for "Transfer Ownership" button (in settings menu)
   - Click it
   - Enter recipient's email: someone@example.com
   - Add optional message: "Can you handle this?"
   - Click "Send Transfer Request"

4. **Check Pending Transfers**
   - Go to "Transfers" tab
   - You should see your transfer request
   - Shows: Pending status, recipient email, when sent

5. **Accept a Transfer (As Recipient)**
   - If someone sends YOU a transfer:
   - Go to "Transfers" tab
   - See "Pending Transfers" section
   - Click "Accept" button
   - Document is now YOURS!

6. **Reject a Transfer**
   - If you don't want it:
   - Click "Decline" instead
   - Transfer is rejected

7. **Cancel Your Transfer**
   - If you sent a transfer and changed your mind:
   - Find it in history
   - Click "Cancel"
   - Transfer is cancelled

8. **Check Transfer History**
   - See all transfers (sent and received)
   - Shows status: Pending, Accepted, Rejected, Cancelled
   - Shows dates and participants

### What You Should See:
- ✅ Can send transfer requests
- ✅ Recipient gets notification
- ✅ Recipient can accept/reject
- ✅ Accepted transfers change document owner
- ✅ History shows all transfers with status

---

## 📋 Quick Test Checklist

### Check In/Out:
- [ ] Dashboard loads without errors
- [ ] "My Checkouts" tab shows (empty at first)
- [ ] Can check out a document
- [ ] Checked out doc appears in "My Checkouts"
- [ ] Shows lock duration and reason
- [ ] Can check in document
- [ ] "All Checkouts" shows team's locks
- [ ] "History" shows past actions

### Transfers:
- [ ] Dashboard loads without errors
- [ ] "Pending Transfers" section shows
- [ ] Can initiate a transfer
- [ ] Transfer appears with "Pending" status
- [ ] Recipient can accept transfer
- [ ] Accepted transfer updates ownership
- [ ] Can reject transfers
- [ ] Transfer history is accurate

---

## 🎯 Easy Testing Without Multiple Users

Since you're testing alone, here's a trick:

**For Transfers:**
1. Send transfer to your OWN email address
2. The system will show it as a "pending" transfer
3. You can then accept/reject it yourself
4. This lets you test the whole flow!

**For Check In/Out:**
1. Just lock and unlock your own documents
2. "All Checkouts" will show your locks (as if you were another user viewing)

---

## 🐛 Troubleshooting

### If Check In/Out doesn't work:
- Did you run the migration? (Tables must exist!)
- Check browser console (F12) for errors
- Backend running on http://localhost:8000?

### If Transfers doesn't work:
- Did you run the migration?
- Do you OWN the document? (Only owners can transfer)
- Check browser console for errors

### Common Errors:
- **"Table doesn't exist"** → Run the migration!
- **"Document not found"** → Make sure you have documents uploaded
- **"Unauthorized"** → You're not logged in or don't own the document

---

## 💡 Pro Tips

1. **Test with Real Documents**
   - Upload some PDFs first
   - More fun to test with real content!

2. **Check the Database**
   - Go to Supabase dashboard
   - Click "Table Editor"
   - Look at `document_locks` and `document_ownership_transfers` tables
   - See your data in real-time!

3. **Watch the Backend Logs**
   - Backend terminal shows what's happening
   - Look for "Document checked out" messages
   - Helpful for debugging

---

## ✅ Success Criteria

**You've successfully tested when:**
- ✅ AI Summaries generate in all 12 languages
- ✅ Can lock/unlock documents
- ✅ Locks show expiration times
- ✅ Can transfer document ownership
- ✅ Transfers require acceptance
- ✅ All actions appear in history

---

**Happy Testing! 🚀**
