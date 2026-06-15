/**
 * 格式化和工具函数
 */

/**
 * 价格颜色渐变：蓝色(最低) → 金色(中间) → 红色(最高)
 * @param {number} price - 当前价格
 * @param {number} minPrice - 最低价格
 * @param {number} maxPrice - 最高价格
 * @returns {string} CSS颜色值
 */
export function getPriceColor(price, minPrice, maxPrice) {
  if (!price || !minPrice || !maxPrice) return 'rgba(255,255,255,0.5)';
  if (minPrice === maxPrice) return '#ffaa00';
  const ratio = (price - minPrice) / (maxPrice - minPrice);
  if (ratio < 0.33) return '#44aaff'; // 蓝色 - 便宜
  if (ratio < 0.66) return '#ffaa00'; // 金色 - 中等
  return '#ff6644'; // 红色 - 贵
}

/**
 * 格式化价格显示
 * @param {number} price - 价格（aUEC）
 * @returns {string} 格式化后的价格字符串
 */
export function formatPrice(price) {
  if (!price && price !== 0) return '—';
  return `${price.toLocaleString()} aUEC`;
}

/**
 * 格式化日期时间
 * @param {Date|string} date - 日期对象或字符串
 * @returns {string} 格式化后的日期时间字符串
 */
export function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 截断文本
 * @param {string} text - 原文本
 * @param {number} maxLength - 最大长度
 * @returns {string} 截断后的文本
 */
export function truncate(text, maxLength = 50) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
