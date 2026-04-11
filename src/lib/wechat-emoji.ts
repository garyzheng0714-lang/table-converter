/**
 * WeChat emoji renderer using actual PNG images from wechat-emojis package.
 * Images are served from /emoji/{name}.png
 */

import { getAllEmojis } from 'wechat-emojis';

const EMOJI_REGEX = /\[([^\]\r\n]{1,6})\]/g;
const EMOJI_BASE_URL = `${import.meta.env.BASE_URL}emoji/`;

let emojiSrcMap: Map<string, string> | null = null;

function getEmojiSrcMap(): Map<string, string> {
  if (emojiSrcMap) return emojiSrcMap;

  const map = new Map<string, string>();
  const emojiList = getAllEmojis() as Array<{ name: string }>;
  for (const emoji of emojiList) {
    map.set(emoji.name, `${EMOJI_BASE_URL}${encodeURIComponent(emoji.name)}.png`);
  }
  emojiSrcMap = map;
  return map;
}

export function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Replace [name] text codes with <img> tags pointing to real WeChat emoji PNGs.
 * Returns an HTML string. Unknown codes are kept as-is.
 */
export function renderWechatEmojiHTML(text: string, size = 20): string {
  const safeText = escapeHTML(text);
  if (!safeText.includes('[') || !safeText.includes(']')) {
    return safeText;
  }

  const style = `width:${size}px;height:${size}px;vertical-align:text-bottom;`;
  const srcByName = getEmojiSrcMap();
  return safeText.replace(EMOJI_REGEX, (match, name: string) => {
    const src = srcByName.get(name);
    if (!src) return match;
    return `<img src="${src}" alt="[${name}]" class="wx-emoji" style="${style}" />`;
  });
}
