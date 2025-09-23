// Notification Service for Start Up App
// Handles web notifications for community interactions

class NotificationService {
    constructor() {
        this.permission = 'default';
        this.initialize();
    }

    async initialize() {
        if ('Notification' in window) {
            this.permission = Notification.permission;
        }
    }

    async requestPermission() {
        if ('Notification' in window && this.permission === 'default') {
            this.permission = await Notification.requestPermission();
            return this.permission === 'granted';
        }
        return this.permission === 'granted';
    }

    isEnabled() {
        return this.permission === 'granted';
    }

    showNotification(title, body, options = {}) {
        if (!this.isEnabled()) {
            console.log('Notifications not enabled, permission:', this.permission);
            return;
        }

        console.log('Showing notification:', title, body);

        const defaultOptions = {
            body: body,
            icon: 'assets/logo.svg',
            badge: 'assets/logo.svg',
            tag: 'startup-notification',
            requireInteraction: false
        };

        const notification = new Notification(title, { ...defaultOptions, ...options });
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            notification.close();
        }, 5000);

        return notification;
    }

    // Community-specific notifications
    showReplyNotification(userName, postContent) {
        const settings = this.getNotificationSettings();
        console.log('Reply notification requested:', { userName, postContent, settings });
        if (settings.replyNotif) {
            this.showNotification(
                'New Reply',
                `${userName} replied to your post: "${postContent.substring(0, 50)}${postContent.length > 50 ? '...' : ''}"`
            );
        } else {
            console.log('Reply notifications disabled');
        }
    }

    showPostNotification(userName, postContent) {
        const settings = this.getNotificationSettings();
        console.log('Post notification requested:', { userName, postContent, settings });
        if (settings.postNotif) {
            this.showNotification(
                'New Post',
                `${userName} shared: "${postContent.substring(0, 50)}${postContent.length > 50 ? '...' : ''}"`
            );
        } else {
            console.log('Post notifications disabled');
        }
    }

    showCommentNotification(userName, commentContent) {
        const settings = this.getNotificationSettings();
        console.log('Comment notification requested:', { userName, commentContent, settings });
        if (settings.replyNotif) {
            this.showNotification(
                'New Comment',
                `${userName} commented: "${commentContent.substring(0, 50)}${commentContent.length > 50 ? '...' : ''}"`
            );
        } else {
            console.log('Comment notifications disabled');
        }
    }

    getNotificationSettings() {
        return {
            replyNotif: localStorage.getItem('replyNotifications') !== 'false',
            postNotif: localStorage.getItem('postNotifications') !== 'false'
        };
    }

    setNotificationSettings(settings) {
        localStorage.setItem('replyNotifications', settings.replyNotif);
        localStorage.setItem('postNotifications', settings.postNotif);
    }
}

// Create global instance
window.notificationService = new NotificationService();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationService;
}
