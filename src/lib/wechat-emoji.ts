/**
 * WeChat emoji renderer using actual PNG images from wechat-emojis package.
 * Images are served from /emoji/{name}.png
 */

import { getAllEmojis } from 'wechat-emojis';

// Build name → filename lookup from the library
const emojiList = getAllEmojis();
const NAME_SET = new Set(emojiList.map((e: { name: string }) => e.name));

const EMOJI_REGEX = /\[([^\]]{1,6})\]/g;

/**
 * Replace [name] text codes with <img> tags pointing to real WeChat emoji PNGs.
 * Returns an HTML string. Unknown codes are kept as-is.
 */
export function renderWechatEmojiHTML(text: string, size = 20): string {
  return text.replace(EMOJI_REGEX, (match, name: string) => {
    if (NAME_SET.has(name)) {
      const src = `${import.meta.env.BASE_URL}emoji/${encodeURIComponent(name)}.png`;
      return `<img src="${src}" alt="[${name}]" class="wx-emoji" style="width:${size}px;height:${size}px;vertical-align:text-bottom;" />`;
    }
    return match;
  });
}
