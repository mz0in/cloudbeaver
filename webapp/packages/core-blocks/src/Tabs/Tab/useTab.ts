/*
 * CloudBeaver - Cloud Database Manager
 * Copyright (C) 2020-2021 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0.
 * you may not use this file except in compliance with the License.
 */

import { useContext } from 'react';

import { useExecutor } from '../../useExecutor';
import type { ITabData } from '../TabsContainer/ITabsContainer';
import { TabsContext } from '../TabsContext';

export function useTab(
  tabId: string,
  onOpen?: (tab: ITabData<any>) => void,
  onClose?: (tab: ITabData<any>) => void
) {
  const state = useContext(TabsContext);
  if (!state) {
    throw new Error('TabsContext not provided');
  }

  useExecutor({
    executor: state.openExecutor,
    handlers: [function openHandler(data) {
      if (tabId !== data.tabId) {
        return;
      }
      onOpen?.(data);
    }],
  });

  useExecutor({
    executor: state.closeExecutor,
    handlers: [function closeHandler(data) {
      if (tabId !== data.tabId) {
        return;
      }
      onClose?.(data);
    }],
  });

  const handleOpen = () => state.open(tabId);

  const handleClose = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation(); // it's here because close triggers handleOpen too
    state.close(tabId);
  };

  return {
    state,
    selected: state.state.selectedId === tabId,
    handleOpen,
    handleClose,
  };
}
