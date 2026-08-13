import React, { useEffect, useState } from 'react';
import { notificationsAPI, toList } from '../../api';
import {
  Loader, Bell, CheckCircle, XCircle, MessageCircle, Banknote,
  Package, Repeat,
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * What each kind of notification looks like.
 *
 * Every row used to carry the same grey bell, which made a list of twenty
 * unreadable at a glance — a rejected order and a delivery reminder were
 * visually identical and you had to read both to tell them apart. The icon is
 * the fastest thing to scan, so it should be the thing that differs.
 *
 * Keys mirror `notif_type` in the backend's create_notification calls. Anything
 * unrecognised falls back to a bell rather than rendering nothing, because a
 * new notification type on the server must never produce a blank row here.
 */
const NOTIF_ICONS = {
  request_accepted: { Icon: CheckCircle, tone: 'success' },
  request_rejected: { Icon: XCircle, tone: 'error' },
  payment_received: { Icon: Banknote, tone: 'success' },
  new_message: { Icon: MessageCircle, tone: 'info' },
  new_request: { Icon: Package, tone: 'info' },
  status_update: { Icon: Package, tone: 'info' },
  basket_reminder: { Icon: Repeat, tone: 'accent' },
  payout_update: { Icon: Banknote, tone: 'success' },
};

const TONES = {
  success: ['var(--color-primary-50)', 'var(--color-primary-700)'],
  error: ['#fee2e2', '#b91c1c'],
  info: ['#e0e7ff', '#3730a3'],
  accent: ['var(--color-accent-50)', 'var(--color-accent-700)'],
  muted: ['var(--color-gray-100)', 'var(--color-gray-500)'],
};

const CustomerNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsAPI.list();
      setNotifications(toList(res.data));
    } catch (err) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      toast.success('All marked as read');
    } catch (err) {
      toast.error('Failed operation');
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        {/* `size` given explicitly. Lucide defaults to 24, which sat oddly
            large against the heading and shrank in the flex row alongside it. */}
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell size={22} className="flex-shrink-0" /> Notifications
        </h1>
        {notifications.some(n => !n.is_read) && (
          <button onClick={markAllRead} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            <CheckCircle size={16} /> Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader className="animate-spin" /></div>
      ) : notifications.length === 0 ? (
        <div className="empty-state text-center p-12 bg-gray-50 rounded-lg">
          <Bell className="empty-state__icon mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium">All caught up!</h3>
          <p className="text-gray-500">You have no notifications right now.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm divide-y">
          {notifications.map(notif => (
            <div 
              key={notif.id} 
              onClick={() => !notif.is_read && markAsRead(notif.id)}
              className={`p-4 flex gap-4 cursor-pointer transition-colors ${notif.is_read ? 'bg-white opacity-75' : 'bg-blue-50/50 hover:bg-blue-50'}`}
            >
              {(() => {
                const { Icon, tone } = NOTIF_ICONS[notif.type] || { Icon: Bell, tone: 'info' };
                // A read notification loses its colour but keeps its shape —
                // the icon still says what it was about.
                const [bg, fg] = TONES[notif.is_read ? 'muted' : tone];
                return (
                  <div
                    className="mt-1 flex-shrink-0 flex items-center justify-center rounded-full"
                    // Explicit box rather than padding around the glyph: a
                    // padded inline element still shrinks, and the whole point
                    // of this circle is that it stays a circle.
                    style={{ width: 40, height: 40, background: bg, color: fg }}
                  >
                    <Icon size={20} />
                  </div>
                );
              })()}
              <div className="flex-1">
                <h4 className={`font-medium ${!notif.is_read && 'font-bold'}`}>{notif.title}</h4>
                <p className="text-gray-600 mt-1">{notif.body}</p>
                <span className="text-xs text-gray-400 mt-2 block">{new Date(notif.created_at).toLocaleString()}</span>
              </div>
              {!notif.is_read && <div className="w-2 h-2 rounded-full bg-blue-600 mt-2"></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerNotifications;
