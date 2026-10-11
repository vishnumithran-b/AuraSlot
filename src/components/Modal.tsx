import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  titleId?: string;
  ariaLabel?: string;
  preventClose?: boolean;
  maxWidth?: string;
  className?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  titleId,
  ariaLabel,
  preventClose = false,
  maxWidth = 'min(480px, 100%)',
  className = '',
  children,
}) => {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Smooth close with reverse animation
  const handleRequestClose = useCallback(() => {
    if (preventClose) return;
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [preventClose, onClose]);

  // Handle open / close animation synchronization
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      previousActiveElement.current = document.activeElement as HTMLElement | null;

      // Body scroll lock
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Small tick for CSS transition
      const frameId = requestAnimationFrame(() => {
        setIsVisible(true);
      });

      // Focus trap initial focus
      const focusTimer = setTimeout(() => {
        if (dialogRef.current) {
          const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusables.length > 0) {
            focusables[0].focus();
          } else {
            dialogRef.current.focus();
          }
        }
      }, 50);

      return () => {
        cancelAnimationFrame(frameId);
        clearTimeout(focusTimer);
        document.body.style.overflow = originalOverflow;
        if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
          previousActiveElement.current.focus();
        }
      };
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setIsMounted(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keyboard navigation: ESC to close, TAB cycle trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!preventClose) {
          e.preventDefault();
          handleRequestClose();
        }
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, preventClose, handleRequestClose]);

  if (!isMounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      role="presentation"
      onClick={(e) => {
        // Overlay click closes unless prevented
        if (e.target === e.currentTarget && !preventClose) {
          handleRequestClose();
        }
      }}
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 max-sm:items-end max-sm:p-0 transition-opacity duration-150 ease-out ${
        isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={!titleId ? ariaLabel || 'Dialog' : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: maxWidth,
          maxHeight: '90vh',
        }}
        className={`relative flex flex-col bg-[#FFFDF9] border border-stone-200/90 shadow-2xl overflow-hidden transition-all duration-200 ease-out max-sm:w-full max-sm:max-w-full max-sm:rounded-t-[20px] max-sm:rounded-b-none sm:rounded-[20px] outline-none ${
          isVisible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-[0.96] max-sm:translate-y-full translate-y-0'
        } ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};
