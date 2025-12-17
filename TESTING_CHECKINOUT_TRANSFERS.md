# Testing Check In/Out and Transfers

## ✅ What's Been Added

You now have **Check Out** and **Transfer Ownership** buttons on every document!

### Where to Find Them

1. Go to the **Documents** tab in your main dashboard
2. Look at any document card (in grid view) or document row (in list view)
3. Hover over the document to see the action buttons appear
4. You'll see two new buttons:
   - **Lock icon** - Check Out
   - **UserMinus icon** - Transfer Ownership

## 🧪 How to Test Check In/Out

### Step 1: Check Out a Document

1. Go to the **Documents** tab
2. Hover over any document
3. Click the **Lock** button (Check Out)
4. A dialog will appear asking for:
   - **Duration**: Select how long you want to lock it (1 hour, 4 hours, 8 hours, 1 day, or 1 week)
   - **Reason**: Enter why you're checking it out (required)
5. Click **Check Out**
6. You should see a success toast notification

### Step 2: View Checked Out Documents

1. Go to the **Check In/Out** tab (top navigation)
2. You should now see your document in the "My Checkouts" section
3. Details shown:
   - Document name
   - Lock reason
   - Expiration time
   - How long ago it was locked

### Step 3: Check In a Document

1. In the **Check In/Out** tab, find your locked document
2. Click **Check In** button
3. The document should disappear from the list
4. You should see a success notification

## 🔄 How to Test Transfers

### Step 1: Initiate a Transfer

1. Go to the **Documents** tab
2. Hover over any document you own
3. Click the **UserMinus** button (Transfer Ownership)
4. A dialog will appear asking for:
   - **Recipient Email**: Enter the email of who should receive the document
   - **Message** (optional): Add a note for the recipient
5. Click **Send Transfer Request**
6. You should see a success notification

### Step 2: View Pending Transfers

1. Go to the **Transfers** tab (top navigation)
2. You should see your transfer in the "Pending Transfers" section
3. Status will show as "pending"

### Step 3: Accept/Reject Transfer (Testing with Your Own Email)

Since you're testing alone, use your own email:

1. When creating the transfer, use your own email address
2. Go to the **Transfers** tab
3. The transfer will appear in "Pending Transfers"
4. Click **Accept** or **Reject**
5. If accepted:
   - The document ownership changes to you (no visible difference since it's already yours)
   - Transfer status changes to "accepted"
   - Transfer moves to history
6. If rejected:
   - Transfer status changes to "rejected"
   - Transfer moves to history
   - Original owner keeps the document

## 📋 Success Checklist

- [ ] **Check Out button** appears on documents when hovering
- [ ] **Transfer button** appears on documents when hovering
- [ ] Check Out dialog opens with duration and reason fields
- [ ] After checking out, document appears in Check In/Out tab
- [ ] Can check in document from Check In/Out tab
- [ ] Transfer dialog opens with email and message fields
- [ ] After initiating transfer, it appears in Transfers tab
- [ ] Can accept/reject transfers from Transfers tab
- [ ] Success toasts appear for all actions
- [ ] No console errors

## 🐛 Troubleshooting

### Buttons Don't Appear
- Make sure you're hovering over the document
- Try switching between Grid and List view
- Check browser console for errors

### Check Out Dialog Doesn't Submit
- Make sure you've entered a **Reason** (required field)
- Check that backend is running on port 8000

### Transfer Dialog Doesn't Submit
- Make sure the email is valid format
- The user must exist in the database
- Check backend logs for errors

### Nothing Appears in Dashboards
- You need to perform the action first (check out or transfer)
- The dashboards only SHOW existing locks/transfers
- Refresh the page if needed

### Backend Not Responding
1. Check backend is running: `http://localhost:8000/docs`
2. Check migration was run in Supabase
3. Check browser console for API errors
4. Check backend terminal for error logs

## 📝 Test Scenarios

### Scenario 1: Quick Lock (1 hour)
1. Check out document for 1 hour with reason "Quick review"
2. Verify it appears in My Checkouts
3. Check in immediately
4. Verify it disappears

### Scenario 2: Long Lock (1 week)
1. Check out document for 1 week with reason "Comprehensive audit"
2. Verify expiration date is 7 days from now
3. Check dashboard shows "Expires in 7 days"

### Scenario 3: Self-Transfer
1. Transfer document to your own email
2. Verify it appears as pending
3. Accept the transfer
4. Verify status changes to "accepted"
5. Check history tab shows the completed transfer

### Scenario 4: Multiple Check Outs
1. Check out 3 different documents
2. Verify all 3 appear in "My Checkouts"
3. Check statistics show "3 documents checked out"
4. Check in one document
5. Verify count updates to 2

## 🎯 What Should Work Now

✅ Check Out documents with custom duration and reason
✅ View all your checked out documents in one place
✅ Check In documents when done
✅ See lock history and statistics
✅ Transfer document ownership to others
✅ View pending transfers (incoming and outgoing)
✅ Accept or reject transfer requests
✅ View transfer history with status
✅ Toast notifications for all actions
✅ Real-time updates in dashboards

## 🚀 Next Steps (Optional Enhancements)

- Add lock status indicator on document cards (locked badge)
- Email notifications for transfers
- Auto-expire locks after duration
- Bulk check out/check in
- Transfer approval workflows
- Lock extension/renewal
- Force unlock for admins
