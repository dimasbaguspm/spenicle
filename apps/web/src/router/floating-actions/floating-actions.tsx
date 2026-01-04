import { useMatches } from "react-router";
import { useFloatingActionHandler } from "./handler";
import type { FloatingActionsHandle, FloatingActionItem } from "./types";
import { EllipsisVerticalIcon, Plus, XIcon } from "lucide-react";
import { useState } from "react";
import {
  Button,
  ButtonIcon,
  useDesktopBreakpoint,
  useMobileBreakpoint,
} from "@dimasbaguspm/versaur";

/**
 * FloatingActions component
 * Renders floating action button(s) based on route handle configuration
 * Dynamically shows actions defined in the current route's handle.floatingActionButton
 */
export const FloatingActions = () => {
  const matches = useMatches();
  const { handleAction } = useFloatingActionHandler();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMobileBreakpoint();

  const handle = matches
    .slice()
    .reverse()
    .find(
      (match) => (match.handle as FloatingActionsHandle)?.floatingActionButton
    )?.handle as FloatingActionsHandle | undefined;

  const actions = handle?.floatingActionButton || [];

  if (actions.length === 0) {
    return null;
  }

  // Single action
  if (actions.length === 1 && actions[0]) {
    const action: FloatingActionItem = actions[0];
    return (
      <div
        className={
          "fixed right-6 z-40" + (isMobile ? " bottom-20" : " bottom-6")
        }
      >
        <ButtonIcon
          onClick={() => handleAction(action)}
          as={Plus}
          size="lg"
          shape="rounded"
          aria-label={action.label}
          title={action.label}
        />
      </div>
    );
  }

  // Multiple actions
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={
          "fixed right-6 z-40 flex flex-col items-end gap-3 " +
          (isMobile ? "bottom-20" : "bottom-6")
        }
      >
        {isOpen && (
          <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {actions.map((button, index) => (
              <Button
                key={index}
                variant="ghost"
                onClick={() => handleAction(button)}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {button.label}
              </Button>
            ))}
          </div>
        )}

        <ButtonIcon
          size="lg"
          shape="rounded"
          as={isOpen ? XIcon : EllipsisVerticalIcon}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
        />
      </div>
    </>
  );
};
