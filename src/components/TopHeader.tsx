import { BackendIndicator } from "@/components/BackendIndicator";
import { LockNotificationsList } from "@/components/notifications/LockNotificationsList";

/**
 * TopHeader - Minimal top bar for notifications and status indicators
 * Used alongside the left Sidebar for navigation
 */
export const TopHeader = () => {
    return (
        <header className="h-14 bg-card border-b border-border flex items-center justify-end px-4 gap-4">
            <BackendIndicator />
            <LockNotificationsList />
        </header>
    );
};
