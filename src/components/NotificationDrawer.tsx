import React from "react";
import { X, CheckCircle, Bell, ArrowRight } from "lucide-react";
import { SmartNotification } from "../types";

interface NotificationDrawerProps {
  notifications: SmartNotification[];
  unreadAlerts: number;
  setShowNotificationDrawer: (s: boolean) => void;
  markAllNotificationsAsRead: () => void;
  openMissionChat: (missionId: string) => void;
}

export function NotificationDrawer({
  notifications,
  unreadAlerts,
  setShowNotificationDrawer,
  markAllNotificationsAsRead,
  openMissionChat
}: NotificationDrawerProps) {
  return (
    <div 
      className="fixed inset-0 z-[50] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Notifications Drawer"
    >
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity"
        onClick={() => setShowNotificationDrawer(false)}
        aria-hidden="true"
      ></div>

      <div className="w-[85%] max-w-[320px] bg-brand-bg h-full shadow-premium-lg border-l border-brand-border/50 flex flex-col relative z-[50] animate-slide-in-right">
        <div className="px-5 py-4 border-b border-brand-border/50 flex items-center justify-between bg-white/50 backdrop-blur">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-brand-text-primary" />
            <h3 className="text-body-strong">System Alerts</h3>
            {unreadAlerts > 0 && (
              <span className="text-[10px] bg-brand-danger text-white px-2 py-0.5 rounded-md font-bold">{unreadAlerts} New</span>
            )}
          </div>
          <button
            onClick={() => setShowNotificationDrawer(false)}
            className="p-1.5 hover:bg-brand-subtle rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:outline-none text-brand-text-secondary"
            aria-label="Close notifications"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.map((n) => (
            <button
              key={n.id}
              className={`w-full text-left p-4 rounded-xl border relative transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:outline-none cursor-pointer interactive-card ${
                !n.read ? "bg-white border-brand-accent/30" : "bg-brand-card border-brand-border/40 hover:bg-white"
              }`}
              onClick={() => {
                 setShowNotificationDrawer(false);
                 if (n.missionId) openMissionChat(n.missionId);
              }}
              aria-label={`Notification: ${n.title}`}
            >
              {!n.read && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-accent animate-pulse" aria-hidden="true"></div>
              )}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-md font-bold ${
                    n.type === "deadline" ? "bg-red-50 text-brand-danger" :
                    n.type === "reminder" ? "bg-orange-50 text-brand-warning" :
                    n.type === "achievement" ? "bg-emerald-50 text-brand-success" :
                    "bg-brand-accent/10 text-brand-accent"
                  }`}>
                    {n.type}
                  </span>
                  <span className="text-[10px] text-brand-text-muted">{n.timestamp}</span>
                </div>
                <h5 className={`text-sm font-semibold ${!n.read ? "text-brand-text-primary" : "text-brand-text-secondary"}`}>
                  {n.title}
                </h5>
                <p className="text-caption">
                  {n.description}
                </p>
                {n.missionId && (
                   <div className="text-[10px] text-brand-accent flex items-center mt-2 font-semibold">
                      Open related mission chat
                      <ArrowRight className="w-3 h-3 ml-1" />
                   </div>
                )}
              </div>
            </button>
          ))}

          {notifications.length === 0 && (
            <div className="text-center space-y-3 py-12">
              <CheckCircle className="w-12 h-12 text-brand-text-muted mx-auto" />
              <p className="text-body text-brand-text-secondary">Zero system alerts pending.</p>
            </div>
          )}
        </div>

        {unreadAlerts > 0 && (
          <div className="p-4 border-t border-brand-border/50 bg-brand-card">
            <button
              onClick={markAllNotificationsAsRead}
              className="w-full py-2.5 bg-brand-bg hover:bg-brand-subtle border border-brand-border rounded-xl text-xs font-semibold text-brand-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:outline-none"
            >
              Mark all secured
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
