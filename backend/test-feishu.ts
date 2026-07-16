import * as crypto from 'crypto';

const WEBHOOK_URL = 'https://open.feishu.cn/open-apis/bot/v2/hook/b96893fe-e90b-4cb9-93e0-9109eead6c15';
const SECRET = 'kPlFb9FsarVQqgtPhgRHJh';

function generateSignature(): { timestamp: string; sign: string } {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const stringToSign = `${timestamp}\n${SECRET}`;
  const sign = crypto
    .createHmac('sha256', stringToSign)
    .update('')
    .digest('base64');
  return { timestamp, sign };
}

async function sendTestCard() {
  const { timestamp, sign } = generateSignature();
  console.log('Timestamp:', timestamp);
  console.log('Sign:', sign);
  const card = {
    config: {
      wide_screen_mode: true,
      enable_forward: true,
    },
    header: {
      template: 'blue',
      title: {
        tag: 'plain_text',
        content: '✅ 飞书通知测试',
      },
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: '**测试消息**：企微转飞书功能已完成开发！',
        },
      },
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: '**测试时间**：' + new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
        },
      },
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: '**功能状态**：🎉 已完成',
        },
      },
    ],
    actions: [
      {
        tag: 'button',
        text: {
          tag: 'plain_text',
          content: '查看系统',
        },
        type: 'primary',
        url: 'http://localhost:3000/',
      },
    ],
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timestamp,
        sign,
        msg_type: 'interactive',
        card,
      }),
    });

    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));

    if (result.code === 0) {
      console.log('\n✅ 飞书通知发送成功！请查看飞书群消息');
    } else {
      console.log('\n❌ 飞书通知发送失败:', result.msg);
    }
  } catch (error) {
    console.error('\n❌ 发送异常:', error.message);
  }
}

sendTestCard();
