// useMobileView.js - ??? hook,???????/??????
import { useState, useCallback } from 'react';
import { useMediaQuery } from '@mui/material';

/**
 * Manages list/detail view switching for mobile devices.
 * On desktop (>=768px), both panels are visible simultaneously.
 * On mobile (<768px), clicking a list item switches to detail view,
 * and goBack() returns to the list.
 *
 * @param {string} initialView - Initial view mode ('list' or 'detail')
 * @returns {{ viewMode: string, selectedItem: any, selectItem: Function, goBack: Function, isMobile: boolean }}
 */
export default function useMobileView(initialView = 'list') {
  const isMobile = !useMediaQuery('(min-width:768px)');

  const [viewMode, setViewMode] = useState(initialView);
  const [selectedItem, setSelectedItem] = useState(null);

  const selectItem = useCallback((item) => {
    setSelectedItem(item);
    if (isMobile) {
      setViewMode('detail');
    }
  }, [isMobile]);

  const goBack = useCallback(() => {
    setViewMode('list');
    // Keep selectedItem so returning to detail is instant if needed
  }, []);

  return { viewMode, selectedItem, selectItem, goBack, isMobile };
}
