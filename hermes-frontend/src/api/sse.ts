export type SSEEventType = 'hermes_log' | 'lead_update' | 'pipeline_progress' | 'email_sent';

/** Event types that trigger a browser notification when the page is not focused. */
const NOTIFY_EVENT_TYPES: ReadonlySet<SSEEventType> = new Set([
  'lead_update',
  'email_sent',
]);

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp: string;
}

type EventCallback = (event: SSEEvent) => void;

/**
 * Build a human-readable notification title and body from an SSE event.
 */
function buildNotificationContent(event: SSEEvent): { title: string; body: string } {
  const payload = event.data as Record<string, unknown> | undefined;

  switch (event.type) {
    case 'lead_update': {
      const name = (payload?.name as string) || 'A lead';
      const status = (payload?.status as string) || 'updated';
      return { title: 'Lead Update', body: `${name} — ${status}` };
    }
    case 'email_sent': {
      const to = (payload?.to as string) || (payload?.recipient as string) || 'a contact';
      const subject = (payload?.subject as string) || 'No subject';
      return { title: 'Email Sent', body: `To ${to}: ${subject}` };
    }
    default:
      return { title: 'Hermes CRM', body: 'You have a new notification.' };
  }
}

/**
 * Show a browser Notification for important SSE events when the tab is not focused.
 */
function maybeShowBrowserNotification(event: SSEEvent): void {
  // Only notify for important event types
  if (!NOTIFY_EVENT_TYPES.has(event.type)) return;

  // Only notify when the page is not focused
  if (document.hasFocus()) return;

  // Only notify if Notifications are permitted
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const { title, body } = buildNotificationContent(event);

  try {
    new Notification(title, {
      body,
      icon: '/favicon.svg',
      tag: `sse-${event.type}-${Date.now()}`,
    });
  } catch {
    // Notification constructor may throw in some contexts (e.g. insecure origin).
  }
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<SSEEventType, Set<EventCallback>> = new Map();
  private url: string = '';
  /** Set to false to suppress browser notifications from SSE events. */
  public browserNotificationsEnabled: boolean = true;

  connect(url: string): void {
    this.disconnect();
    this.url = url;
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      console.log('[SSE] Connected to', url);
    };

    this.eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
    };

    // Listen for each event type
    const eventTypes: SSEEventType[] = [
      'hermes_log',
      'lead_update',
      'pipeline_progress',
      'email_sent',
    ];

    eventTypes.forEach((type) => {
      this.eventSource!.addEventListener(type, (event: MessageEvent) => {
        const sseEvent: SSEEvent = {
          type,
          data: JSON.parse(event.data),
          timestamp: new Date().toISOString(),
        };

        // Optionally trigger a browser notification for important events
        if (this.browserNotificationsEnabled) {
          maybeShowBrowserNotification(sseEvent);
        }

        this.emit(type, sseEvent);
      });
    });
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log('[SSE] Disconnected from', this.url);
    }
  }

  onEvent(type: SSEEventType, callback: EventCallback): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  private emit(type: SSEEventType, event: SSEEvent): void {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.forEach((cb) => cb(event));
    }
  }

  get isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

// Singleton instance
export const sseClient = new SSEClient();
