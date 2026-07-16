import requests
import time
import hmac
import hashlib
import base64

WEBHOOK_URL = 'https://open.feishu.cn/open-apis/bot/v2/hook/b96893fe-e90b-4cb9-93e0-9109eead6c15'
SECRET = 'kPlFb9FsarVQqgtPhgRHJh'

timestamp = str(int(time.time()))
string_to_sign = f"{timestamp}\n{SECRET}"
sign = base64.b64encode(hmac.new(SECRET.encode('utf-8'), string_to_sign.encode('utf-8'), digestmod=hashlib.sha256).digest()).decode('utf-8')

print(f"Timestamp: {timestamp}")
print(f"Sign: {sign}")

card = {
    "config": {
        "wide_screen_mode": True,
        "enable_forward": True,
    },
    "header": {
        "template": "blue",
        "title": {
            "tag": "plain_text",
            "content": "✅ 飞书通知测试",
        },
    },
    "elements": [
        {
            "tag": "div",
            "text": {
                "tag": "lark_md",
                "content": "**测试消息**：企微转飞书功能已完成开发！",
            },
        },
    ],
    "actions": [
        {
            "tag": "button",
            "text": {
                "tag": "plain_text",
                "content": "查看系统",
            },
            "type": "primary",
            "url": "http://localhost:3000/",
        },
    ],
}

data = {
    "msg_type": "interactive",
    "card": card,
}

headers = {
    "X-Lark-Timestamp": timestamp,
    "X-Lark-Signature": sign,
}

response = requests.post(WEBHOOK_URL, json=data, headers=headers)
print("Response:", response.json())
