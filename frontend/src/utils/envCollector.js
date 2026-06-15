// envCollector.js — 自动采集用户环境信息（只读展示给用户）

/**
 * Collect browser and page environment information for feedback.
 * @param {string} activeTab - Current active tab key (e.g. 'sell', 'buy')
 * @returns {{ userAgent: string, viewport: string, url: string, activeTab: string, timestamp: string }}
 */
export function collectEnvInfo(activeTab = '') {
  const tabNameMap = {
    sell: '清仓路线',
    buy: '进货路线',
    chain: '链式跑商',
    price: '价格查询',
    database: '数据库',
    warbond: '战争债券',
  };

  return {
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    url: window.location.href,
    activeTab: tabNameMap[activeTab] || activeTab,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format env info into a human-readable string for display.
 * @param {{ userAgent: string, viewport: string, url: string, activeTab: string, timestamp: string }} env
 * @returns {string} Formatted env info string
 */
export function formatEnvInfo(env) {
  // Extract browser name and version from userAgent
  let browser = '未知';
  if (env.userAgent.includes('Chrome') && !env.userAgent.includes('Edg')) {
    const match = env.userAgent.match(/Chrome\/(\d+)/);
    browser = match ? `Chrome ${match[1]}` : 'Chrome';
  } else if (env.userAgent.includes('Firefox')) {
    const match = env.userAgent.match(/Firefox\/(\d+)/);
    browser = match ? `Firefox ${match[1]}` : 'Firefox';
  } else if (env.userAgent.includes('Safari') && !env.userAgent.includes('Chrome')) {
    const match = env.userAgent.match(/Version\/(\d+)/);
    browser = match ? `Safari ${match[1]}` : 'Safari';
  } else if (env.userAgent.includes('Edg')) {
    const match = env.userAgent.match(/Edg\/(\d+)/);
    browser = match ? `Edge ${match[1]}` : 'Edge';
  }

  // Format timestamp
  const date = new Date(env.timestamp);
  const formatted = date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return `浏览器：${browser}\n屏幕：${env.viewport}\n页面：${env.url}\n当前Tab：${env.activeTab}\n时间：${formatted}`;
}
