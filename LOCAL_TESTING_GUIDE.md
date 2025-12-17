# Testing Transfers with Multiple Accounts Locally

## ✅ YES, It Will Work!

If you're doing everything locally and want to test transfers between users, here's how:

### **Scenario: Testing Transfer from Vasudha to Manjul**

#### Step 1: Log in as Vasudha (vasudha.s@simplifyai.id)
1. Open DocFlow in your browser
2. Log in with vasudha.s@simplifyai.id
3. Go to **Documents** tab
4. Click **Transfer** button on any document
5. Enter: `manjul.t@simplifyai.id` as recipient
6. Click **Send Transfer Request**
7. ✅ Transfer is now stored in Supabase database

#### Step 2: Log out
1. Click your profile/avatar
2. Click **Logout**
3. You're now logged out

#### Step 3: Log in as Manjul (manjul.t@simplifyai.id)
1. Click **Login** button
2. Enter manjul.t@simplifyai.id credentials
3. Log in
4. Go to **Transfers** tab (top navigation)
5. ✅ **You will see the transfer!** It will appear in "Pending Transfers" section

#### What You'll See:
```
📨 Pending Transfers (1)

┌─────────────────────────────────────────┐
│  📄 Document Transfer                    │
│  ✉️  From: vasudha.s@simplifyai.id      │
│  "Please review this document"           │
│  2 minutes ago                           │
│                                          │
│  [✓ Accept]  [✗ Decline]               │
└─────────────────────────────────────────┘
```

---

## 🔍 How It Works Locally

### Database is Shared
- Both accounts (vasudha and manjul) access the **same Supabase database**
- When vasudha creates a transfer, it's inserted into `document_ownership_transfers` table
- When manjul logs in, the hook queries `WHERE to_user_id = manjul's_user_id`
- Result: Manjul sees the transfer!

### No Email Needed
- Since you're using **in-app notifications**, NO email is sent
- Everything happens through the database
- As soon as manjul logs in, they see the pending transfer

---

## 🧪 Complete Testing Flow

### 1. Transfer Document (as Vasudha)
```
Login: vasudha.s@simplifyai.id
↓
Documents Tab
↓
Click "Transfer" on a document
↓
Enter: manjul.t@simplifyai.id
↓
Message: "Please review this"
↓
Click "Send Transfer Request"
↓
✅ Toast: "Transfer initiated"
```

### 2. Check Transfer Status (still as Vasudha)
```
Go to Transfers Tab
↓
Click "History" or "Sent"
↓
See status: "pending"
↓
Shows: To: manjul.t@simplifyai.id
```

### 3. Receive Transfer (as Manjul)
```
Logout from Vasudha
↓
Login: manjul.t@simplifyai.id
↓
Go to Transfers Tab
↓
✅ See "Pending Transfers (1)"
↓
Shows: From: vasudha.s@simplifyai.id
```

### 4. Accept Transfer (as Manjul)
```
Click "Accept" button
↓
✅ Toast: "Transfer accepted"
↓
Document ownership changes to Manjul
↓
Transfer moves to "History" with status "accepted"
```

### 5. Verify Transfer Completed (as Vasudha)
```
Logout from Manjul
↓
Login: vasudha.s@simplifyai.id
↓
Go to Transfers Tab
↓
Check History
↓
See status changed to "accepted"
```

---

## 🚨 Important Notes

### ✅ What Works Locally:
- ✅ Create transfers between users
- ✅ See pending transfers when logging in as recipient
- ✅ Accept/reject transfers
- ✅ View transfer history
- ✅ All database operations work

### ❌ What Doesn't Work (Not Implemented):
- ❌ Email notifications (no emails sent)
- ❌ Push notifications
- ❌ Real-time updates (must refresh page after login)
- ❌ Browser notifications

### 🔄 Refresh Page After Login
After logging in as Manjul, if you don't see transfers immediately:
1. Click the **Transfers** tab
2. Or refresh the page (F5)
3. The hook will re-fetch data

---

## 💡 Pro Tips for Testing

### Use Browser Profiles
Instead of logging in/out repeatedly:
1. **Chrome Profile 1**: Logged in as vasudha.s@simplifyai.id
2. **Chrome Profile 2**: Logged in as manjul.t@simplifyai.id
3. Switch between profiles to see both perspectives simultaneously!

### Incognito Windows
1. **Regular window**: Logged in as Vasudha
2. **Incognito window**: Logged in as Manjul
3. Test transfers in real-time!

### Different Browsers
1. **Chrome**: Logged in as Vasudha
2. **Edge/Firefox**: Logged in as Manjul
3. Side-by-side testing!

---

## 📝 Testing Checklist

- [ ] Log in as User A (vasudha.s@simplifyai.id)
- [ ] Initiate transfer to User B (manjul.t@simplifyai.id)
- [ ] See transfer in "Sent" or "History" for User A
- [ ] Log out from User A
- [ ] Log in as User B (manjul.t@simplifyai.id)
- [ ] Navigate to Transfers tab
- [ ] See pending transfer in "Pending Transfers" section
- [ ] Verify "From: vasudha.s@simplifyai.id" is shown (not manjul)
- [ ] Click "Accept" button
- [ ] See success toast
- [ ] Verify transfer moved to History with "accepted" status
- [ ] Log out from User B
- [ ] Log in as User A again
- [ ] Check Transfers tab
- [ ] Verify status changed to "accepted" in history

---

## 🎯 Answer to Your Question

> "if i am doing any changes locally and i am logged in with vasudha.s@simplifyai.id and then i log in with manjul.t@simplifyai.id to check for any transfer notification, will it be visible?"

**YES! Absolutely!** 

When you:
1. Create a transfer as vasudha.s@simplifyai.id
2. Log out
3. Log in as manjul.t@simplifyai.id
4. Go to the Transfers tab

You **WILL** see:
- The pending transfer notification
- "From: vasudha.s@simplifyai.id" (sender)
- The document name
- Accept/Reject buttons

Everything is stored in your local Supabase database, so as long as both users are registered in the same database (which they are), transfers will work perfectly!

