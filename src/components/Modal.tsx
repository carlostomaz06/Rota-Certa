import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Modal Container */}
          <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-lg overflow-hidden rounded-xl border border-line bg-card shadow-custom"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <h3 className="font-condensed text-xl font-bold tracking-wide text-ink uppercase">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1 text-ink-soft hover:bg-paper hover:text-ink transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="flex justify-end gap-3 border-t border-line px-5 py-4 bg-paper/30">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
