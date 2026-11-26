import { requireSetting } from '../config.js';

const token = requireSetting('TELEGRAM_BOT_TOKEN');
const expected = requireSetting('TELEGRAM_BOT_USERNAME');
const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
  signal: AbortSignal.timeout(10000),
}).catch(() => {
  throw new Error('Telegram Bot API unavailable');
});
const data = await response.json();
if (
  !response.ok ||
  data.ok !== true ||
  data.result?.is_bot !== true ||
  data.result.username?.toLowerCase() !== expected.toLowerCase()
) {
  throw new Error('Telegram bot identity does not match configuration');
}
console.log(`Connected to @${expected}`);
