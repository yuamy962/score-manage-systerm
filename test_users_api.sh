#!/bin/bash
# 使用测试用户登录
RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"csyh","password":"123456","captchaId":"test","captchaAnswer":"test"}')

echo "Login response: $RESPONSE"

# 提取token
TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: $TOKEN"

# 使用token调用用户列表API
echo "=== Users API response ==="
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/users
