#!/bin/bash

# Long Health API Test Script
BASE_URL="http://localhost:3001/api/v1"

echo "=== Long Health API Test Suite ==="
echo ""

# Check if jq is installed for pretty printing
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq is not installed. Install it for pretty JSON output:"
    echo "   Ubuntu/Debian: sudo apt-get install jq"
    echo "   macOS: brew install jq"
    echo ""
    JQ="cat"
else
    JQ="jq"
fi

# 1. Health Check
echo "--- Test 1: Health Check ---"
echo "GET http://localhost:3001/health"
curl -s http://localhost:3001/health | $JQ . || echo "Failed"
echo ""

# 2. Send OTP
echo "--- Test 2: Send OTP ---"
echo "POST $BASE_URL/auth/send-otp"
echo "Body: {\"phone\": \"+919876543210\"}"
SEND_OTP_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}')
echo "$SEND_OTP_RESPONSE" | $JQ . || echo "$SEND_OTP_RESPONSE"
echo ""

# 3. Verify OTP
echo "--- Test 3: Verify OTP ---"
echo "Note: In development mode, the OTP is logged to the server console."
echo "Check your server logs to find the OTP, then run:"
echo ""
echo "curl -s -X POST '$BASE_URL/auth/verify-otp' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"phone\": \"+919876543210\", \"otp\": \"YOUR_OTP_HERE\"}' | $JQ ."
echo ""

# 4. Get Profile
echo "--- Test 4: Get Profile ---"
echo "GET $BASE_URL/auth/me"
echo "Header: Authorization: Bearer YOUR_TOKEN_HERE"
echo ""
echo "After logging in with OTP verification, replace YOUR_TOKEN_HERE with the token and run:"
echo "curl -s '$BASE_URL/auth/me' \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN_HERE' | $JQ ."
echo ""

# 5. Update Profile
echo "--- Test 5: Update Profile ---"
echo "PUT $BASE_URL/auth/profile"
echo "Headers: Content-Type: application/json, Authorization: Bearer YOUR_TOKEN_HERE"
echo "Body:"
echo '{
  "name": "Test User",
  "gender": "male",
  "dateOfBirth": "1990-05-15",
  "heightCm": 175,
  "weightKg": 70
}'
echo ""
echo "Run:"
echo "curl -s -X PUT '$BASE_URL/auth/profile' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \\"
echo "  -d '{\"name\":\"Test User\",\"gender\":\"male\",\"dateOfBirth\":\"1990-05-15\",\"heightCm\":175,\"weightKg\":70}' | $JQ ."
echo ""

# 6. Upload Report
echo "--- Test 6: Upload Blood Report ---"
echo "POST $BASE_URL/reports/upload"
echo "Headers: Authorization: Bearer YOUR_TOKEN_HERE"
echo "Form Data: report=@/path/to/blood-report.pdf"
echo ""
echo "Run:"
echo "curl -s -X POST '$BASE_URL/reports/upload' \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \\"
echo "  -F 'report=@/path/to/blood-report.pdf' | $JQ ."
echo ""

# 7. Get Dashboard
echo "--- Test 7: Get Dashboard ---"
echo "GET $BASE_URL/dashboard"
echo "Header: Authorization: Bearer YOUR_TOKEN_HERE"
echo ""
echo "Run:"
echo "curl -s '$BASE_URL/dashboard' \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN_HERE' | $JQ ."
echo ""

# 8. List Reports
echo "--- Test 8: List Reports ---"
echo "GET $BASE_URL/reports?page=1&limit=10"
echo "Header: Authorization: Bearer YOUR_TOKEN_HERE"
echo ""
echo "Run:"
echo "curl -s '$BASE_URL/reports?page=1&limit=10' \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN_HERE' | $JQ ."
echo ""

# 9. Analyze Report
echo "--- Test 9: Analyze Blood Report (Get Analysis) ---"
echo "GET $BASE_URL/reports/:reportId/analysis"
echo "Header: Authorization: Bearer YOUR_TOKEN_HERE"
echo ""
echo "Run (replace REPORT_ID with actual ID from Test 8):"
echo "curl -s '$BASE_URL/reports/REPORT_ID/analysis' \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN_HERE' | $JQ ."
echo ""

echo "=== Test Suite Complete ==="
echo ""
echo "📝 Instructions:"
echo "1. Start the server: npm run dev"
echo "2. Check server console for generated OTP after running Test 2"
echo "3. Use the OTP to verify in Test 3"
echo "4. Replace YOUR_TOKEN_HERE with the JWT token from the verify-otp response"
echo "5. Use that token for authenticated endpoints"
