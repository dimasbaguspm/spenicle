import { useEffect } from 'react';

import type { DrawerId } from '../../constants/drawer-id';

import { useDrawerRouterProvider } from './context';

interface DrawerEventDetail {
  drawerId: DrawerId;
  [key: string]: unknown;
}

interface DrawerDispatchListener {
  onOpen?: (drawerId: DrawerId, detail: object) => void;
  onClose?: (drawerId: DrawerId, detail: object) => void;
  onSubmit?: (drawerId: DrawerId, detail: object) => void;
}

export const useDrawerDispatchListener = (callbacks?: DrawerDispatchListener) => {
  const { dispatchEl } = useDrawerRouterProvider();

  useEffect(() => {
    if (!dispatchEl.current || !callbacks) return;

    const handleOpen = (ev: Event) => {
      const customEvent = ev as CustomEvent<DrawerEventDetail>;
      callbacks.onOpen?.(customEvent.detail.drawerId, customEvent.detail);
    };

    const handleClose = (ev: Event) => {
      const customEvent = ev as CustomEvent<DrawerEventDetail>;
      callbacks.onClose?.(customEvent.detail.drawerId, customEvent.detail);
    };

    const handleSubmit = (ev: Event) => {
      const customEvent = ev as CustomEvent<DrawerEventDetail>;
      callbacks.onSubmit?.(customEvent.detail.drawerId, customEvent.detail);
    };

    dispatchEl.current.addEventListener('drawer-router:open', handleOpen);
    dispatchEl.current.addEventListener('drawer-router:close', handleClose);
    dispatchEl.current.addEventListener('drawer-router:submit', handleSubmit);

    return () => {
      dispatchEl.current?.removeEventListener('drawer-router:open', handleOpen);
      dispatchEl.current?.removeEventListener('drawer-router:close', handleClose);
      dispatchEl.current?.removeEventListener('drawer-router:submit', handleSubmit);
    };
  }, [dispatchEl, callbacks]);
};
