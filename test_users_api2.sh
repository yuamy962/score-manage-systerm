#!/bin/bash
# 获取验证码
CAPTCHA=$(curl -s http://localhost:3001/auth/captcha)
echo "Captcha response: $CAPTCHA"

CAPTCHA_ID=$(echo $CAPTCHA | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Captcha ID: $CAPTCHA_ID"

# 使用测试用户登录（验证码随便填，因为测试环境可能禁用了验证码验证）
RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"csyh\",\"password\":\"123456\",\"captchaId\":\"$CAPTCHA_ID\",\"captchaAnswer\":\"1234\"}")

echo "Login response: $RESPONSE"

# 提取token
TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: $TOKEN"

# 使用token调用用户列表API
echo "=== Users API response ==="
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/users

echo ""
echo ""
echo "=== Issue-scores API response ==="
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/issue-scores
