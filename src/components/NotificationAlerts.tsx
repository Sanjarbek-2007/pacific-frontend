/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { SmartNotification } from "../types";
import { Bell, CheckCircle, Clock, Target, AlertCircle, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NotificationAlertsProps {
  notifications: SmartNotification[];
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
}

export default function NotificationAlerts({
  notifications,
  onMarkRead,
  onClearAll,
}: NotificationAlertsProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="bg-brand-card border-b border-brand-border px-5 py-4 shadow-premium">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-5 h-5 text-brand-text-primary" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-accent rounded-full ring-2 ring-white"></span>
            )}
          </div>
          <h3 className="font-display font-semibold text-base text-brand-text-primary">
            System Intelligence Alerts
          </h3>
          {unreadCount > 0 && (
            <span className="text-xs bg-brand-bg text-brand-text-secondary px-2 py-0.5 rounded-full font-medium">
              {unreadCount} active
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-brand-text-secondary hover:text-brand-text-primary transition-colors pr-1"
          >
            Clear logs
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-4 bg-brand-bg rounded-lg border border-dashed border-brand-border">
          <p className="text-xs text-brand-text-secondary">All system pipelines are clear. No pending actions.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {notifications.map((notif) => {
              const Icon =
                notif.type === "deadline"
                  ? AlertCircle
                  : notif.type === "reflection"
                  ? Clock
                  : notif.type === "achievement"
                  ? CheckCircle
                  : Target;

              const badgeColor =
                notif.type === "deadline"
                  ? "bg-red-50 text-brand-danger"
                  : notif.type === "reflection"
                  ? "bg-amber-50 text-brand-warning"
                  : notif.type === "achievement"
                  ? "bg-green-50 text-brand-success"
                  : "bg-indigo-50 text-brand-accent";

              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-3 rounded-lg border transition-all duration-200 flex items-start gap-3 relative ${
                    notif.read
                      ? "bg-brand-card border-brand-border opacity-70"
                      : "bg-brand-card border-brand-accent/30 shadow-sm"
                  }`}
                >
                  <div className={`p-1.5 rounded-md ${badgeColor} shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium text-xs text-brand-text-primary truncate">
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-brand-text-secondary font-mono shrink-0">
                        {notif.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-brand-text-secondary leading-relaxed">
                      {notif.description}
                    </p>
                  </div>
                  {!notif.read && (
                    <button
                      onClick={() => onMarkRead(notif.id)}
                      className="absolute top-3 right-3 text-brand-text-secondary hover:text-brand-text-primary p-0.5 hover:bg-brand-bg rounded-md transition-all shrink-0"
                      title="Mark as analyzed"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
