"""
Diagnostic Script for Checkout Requests System
Tests the complete guest checkout workflow
"""

import asyncio
import httpx
from datetime import datetime

BASE_URL = "http://localhost:8000"

async def test_checkout_requests():
    """Test the complete checkout request workflow"""
    
    print("=" * 80)
    print("CHECKOUT REQUESTS DIAGNOSTIC TEST")
    print("=" * 80)
    print()
    
    async with httpx.AsyncClient() as client:
        
        # Test 1: Health check
        print("1. Testing API health...")
        try:
            response = await client.get(f"{BASE_URL}/health")
            print(f"   ✅ API is running: {response.status_code}")
        except Exception as e:
            print(f"   ❌ API not accessible: {e}")
            return
        
        print()
        
        # Test 2: Create a test checkout request
        print("2. Testing checkout request creation...")
        test_request = {
            "document_id": "test-doc-123",  # Replace with real document ID
            "requester_email": "guest@example.com",
            "requester_name": "Test Guest",
            "request_message": "Please grant me edit access for testing"
        }
        
        try:
            response = await client.post(
                f"{BASE_URL}/api/v1/checkout-requests/request",
                json=test_request
            )
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Request created: {data.get('id')}")
                request_id = data.get('id')
            else:
                print(f"   ⚠️  Response: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"   ❌ Error creating request: {e}")
        
        print()
        
        # Test 3: Get pending requests (requires user_id)
        print("3. Testing get pending requests...")
        test_user_id = "test-user-123"  # Replace with real user ID
        
        try:
            response = await client.get(
                f"{BASE_URL}/api/v1/checkout-requests/pending",
                headers={"x-user-id": test_user_id}
            )
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Retrieved {len(data)} pending requests")
                for req in data[:3]:  # Show first 3
                    print(f"      - {req.get('document_name')} from {req.get('requester_email')}")
            else:
                print(f"   ⚠️  Response: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"   ❌ Error fetching requests: {e}")
        
        print()
        
        # Test 4: Test approve endpoint (dry run)
        print("4. Testing approve endpoint structure...")
        try:
            response = await client.post(
                f"{BASE_URL}/api/v1/checkout-requests/approve",
                json={
                    "request_id": "test-request-id",
                    "duration_hours": 1
                }
            )
            # We expect this to fail with 404 (not found) which is OK
            if response.status_code == 404:
                print(f"   ✅ Approve endpoint is accessible (404 expected)")
            elif response.status_code == 500:
                print(f"   ⚠️  Server error: {response.text}")
            else:
                print(f"   ℹ️  Response: {response.status_code}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        print()
        
        # Test 5: Test reject endpoint (dry run)
        print("5. Testing reject endpoint structure...")
        try:
            response = await client.post(
                f"{BASE_URL}/api/v1/checkout-requests/reject",
                headers={"x-user-id": test_user_id},
                json={
                    "request_id": "test-request-id"
                }
            )
            # We expect this to fail with 404 (not found) which is OK
            if response.status_code == 404:
                print(f"   ✅ Reject endpoint is accessible (404 expected)")
            elif response.status_code == 500:
                print(f"   ⚠️  Server error: {response.text}")
            else:
                print(f"   ℹ️  Response: {response.status_code}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        print()
        print("=" * 80)
        print("DIAGNOSTIC TEST COMPLETE")
        print("=" * 80)
        print()
        print("Next Steps:")
        print("1. Create a real share link or guest share")
        print("2. Access as guest and request edit access")
        print("3. Check /checkout-requests page as document owner")
        print("4. Approve/reject the request")
        print("5. Verify guest can open editor after approval")
        print()


async def check_database():
    """Check database tables for checkout requests"""
    
    print("=" * 80)
    print("DATABASE CHECK")
    print("=" * 80)
    print()
    
    try:
        from app.core.supabase_client import get_supabase_client
        supabase = get_supabase_client()
        
        # Check checkout_requests table
        print("1. Checking checkout_requests table...")
        response = supabase.table('checkout_requests')\
            .select('*')\
            .limit(5)\
            .execute()
        
        print(f"   Found {len(response.data)} checkout requests")
        for req in response.data:
            print(f"   - {req.get('requester_email')} → {req.get('status')} ({req.get('requested_at')})")
        
        print()
        
        # Check document_locks with guest_email
        print("2. Checking document_locks with guest_email...")
        response = supabase.table('document_locks')\
            .select('*')\
            .not_('guest_email', 'is', None)\
            .eq('is_active', True)\
            .execute()
        
        print(f"   Found {len(response.data)} active guest checkouts")
        for lock in response.data:
            print(f"   - Guest: {lock.get('guest_email')} | Expires: {lock.get('expires_at')}")
        
        print()
        print("=" * 80)
        
    except Exception as e:
        print(f"❌ Database check failed: {e}")
        print("Make sure backend is running and database is accessible")


if __name__ == "__main__":
    print()
    print("CHECKOUT REQUESTS SYSTEM DIAGNOSTICS")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Run API tests
    asyncio.run(test_checkout_requests())
    
    print()
    
    # Run database check
    try:
        asyncio.run(check_database())
    except Exception as e:
        print(f"Skipping database check: {e}")
    
    print()
    print("Done!")
