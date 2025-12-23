import type { Bill } from "./billService";
import { toast } from "react-hot-toast";

const NOTIFICATION_SETTINGS_KEY = 'billNotificationsEnabled';

/**
 * Get notification preference from localStorage
 */
export function getNotificationPreference(): boolean {
    const stored = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    return stored === null ? true : stored === 'true'; // Default to enabled
}

/**
 * Set notification preference in localStorage
 */
export function setNotificationPreference(enabled: boolean): void {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, enabled.toString());
}

/**
 * Check for overdue bills
 */
export function getOverdueBills(bills: Bill[]): Bill[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return bills.filter(bill => {
        if (bill.isPaid) return false;

        const billDate = new Date(bill.dueDate);
        billDate.setHours(0, 0, 0, 0);

        return billDate < today;
    });
}

/**
 * Check for upcoming bills (due within 1 day)
 */
export function getUpcomingBills(bills: Bill[]): Bill[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return bills.filter(bill => {
        if (bill.isPaid) return false;

        const billDate = new Date(bill.dueDate);
        billDate.setHours(0, 0, 0, 0);

        return billDate.getTime() === tomorrow.getTime();
    });
}

/**
 * Track if notifications have been shown this session
 */
let notificationsShown = false;

/**
 * Reset notification tracking (call when user manually dismisses or on page navigation)
 */
export function resetNotificationTracking(): void {
    notificationsShown = false;
}

/**
 * Show bill notifications based on user preference
 */
export function showBillNotifications(bills: Bill[]): void {
    if (!getNotificationPreference() || notificationsShown) {
        return; // User has disabled notifications or already shown this session
    }

    const overdueBills = getOverdueBills(bills);
    const upcomingBills = getUpcomingBills(bills);

    // Show overdue bills notification
    if (overdueBills.length > 0) {
        toast.error(
            `You have ${overdueBills.length} overdue bill${overdueBills.length > 1 ? 's' : ''}`,
            { duration: 5000, icon: '⚠️' }
        );
    }

    // Show upcoming bills notifications
    upcomingBills.forEach(bill => {
        toast(
            `Bill "${bill.title}" is due tomorrow`,
            { duration: 4000, icon: '📅' }
        );
    });

    // Mark notifications as shown for this session
    if (overdueBills.length > 0 || upcomingBills.length > 0) {
        notificationsShown = true;
    }
}
