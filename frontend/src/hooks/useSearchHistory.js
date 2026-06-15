// useSearchHistory.js - 搜索历史记录管理
import { useState, useCallback, useEffect } from 'react';

const MAX_HISTORY = 10; // 最多保存10条历史记录

/**
 * 搜索历史记录Hook
 * @param {string} storageKey - localStorage存储键名
 * @returns {Object} 历史记录相关方法和状态
 */
export function useSearchHistory(storageKey) {
  const [history, setHistory] = useState([]);

  // 从localStorage加载历史记录
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch { /* ignored */ }
  }, [storageKey]);

  // 保存历史记录到localStorage
  const _saveHistory = useCallback((newHistory) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newHistory));
      setHistory(newHistory);
    } catch { /* ignored */ }
  }, [storageKey]);

  // 添加搜索记录
  const addToHistory = useCallback((item) => {
    setHistory(prev => {
      // 过滤掉相同的记录（根据id判断）
      const filtered = prev.filter(h => h.id !== item.id);
      // 新记录放在最前面
      const newHistory = [item, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(storageKey, JSON.stringify(newHistory));
      return newHistory;
    });
  }, [storageKey]);

  // 删除单条历史记录
  const removeFromHistory = useCallback((id) => {
    setHistory(prev => {
      const newHistory = prev.filter(h => h.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(newHistory));
      return newHistory;
    });
  }, [storageKey]);

  // 清空历史记录
  const clearHistory = useCallback(() => {
    localStorage.removeItem(storageKey);
    setHistory([]);
  }, [storageKey]);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}

export default useSearchHistory;
