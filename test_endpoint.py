import requests
import json

try:
    response = requests.get('http://localhost:8000/api/document-fields')
    response.raise_for_status()
    data = response.json()
    
    print(f"✅ SUCCESS! Endpoint is working!\n")
    print(f"📊 Total fields found: {data['count']}\n")
    print("📋 First 15 fields:\n")
    
    for i, field in enumerate(data['fields'][:15], 1):
        print(f"  {i}. {field['label']} [{field['type']}]")
        print(f"     Field name: {field['name']}")
        print(f"     Operators: {', '.join(field['operators'])}")
        if field.get('description'):
            print(f"     Description: {field['description']}")
        print()
        
except requests.exceptions.ConnectionError:
    print("❌ Error: Cannot connect to backend server")
    print("   Make sure the server is running on http://localhost:8000")
except Exception as e:
    print(f"❌ Error: {e}")
