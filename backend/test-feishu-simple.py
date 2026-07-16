import requests
import time
import hmac
import hashlib
import base64

WEBHOOK_URL = 'https://open.feishu.cn/open-apis/bot/v2/hook/b96893fe-e90b-4cb9-93e0-9109eead6c15'
SECRET = 'kPlFb9FsarVQqgtPhgRHJh'

timestamp = str(int(time.time()))
string_to_sign = f"{timestamp}\n{SECRET}"
sign = base64.b64encode(hmac.new(string_to_sign.encode('utf-8'), b'', digestmod=hashlib.sha256).digest()).decode('utf-8')

print(f"Timestamp: {timestamp}")
print(f"Sign: {sign}")

data = {
    "timestamp": timestamp,
    "sign": sign,
    "msg_type": "text",
    "content": {
        "text": "测试消息：企微转飞书功能已完成开发！"
    },
}

response = requests.post(WEBHOOK_URL, json=data)
print("Response:", response.json())
