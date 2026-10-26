type OnMessage = (msg: unknown) => void;

const WS_DEBUG_KEY = "wsDebug";
const WS_DEBUG_QUERY = "wsDebug";

export class MarketSocket {
  private socket: WebSocket | null = null;
  private pendingSubscriptions: Set<string> = new Set();
  private isConnecting = false;
  private shouldCloseOnOpen = false;
  private manualClose = false;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private lastToken: string | null = null;
  private lastOnMessage: OnMessage | null = null;
  private lastBaseUrl: string | null = null;

  connect(token: string, onMessage: OnMessage): void {
    this.lastToken = token;
    this.lastOnMessage = onMessage;

    const rawBaseUrl =
      process.env.NEXT_PUBLIC_SOKET_API_URL ??
      process.env.NEXT_PUBLIC_SOCKET_API_URL;

    if (!rawBaseUrl) {
      console.error(
        "NEXT_PUBLIC_SOKET_API_URL / NEXT_PUBLIC_SOCKET_API_URL is not defined"
      );
      return;
    }

    const baseUrl = normalizeWebSocketUrl(rawBaseUrl);
    this.lastBaseUrl = baseUrl;
    const debug = isMarketSocketDebugEnabled();

    // Prevent multiple connections
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      if (debug) {
        console.log("[MarketSocket] connect skipped (already connected)");
      }
      return;
    }

    if (this.isConnecting) return;

    this.isConnecting = true;
    this.shouldCloseOnOpen = false;
    this.manualClose = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      this.socket = new WebSocket(
        `${baseUrl}?token=${encodeURIComponent(token)}`
      );
    } catch (err) {
      console.error("WebSocket init failed:", err);
      this.isConnecting = false;
      return;
    }

    this.socket.onopen = () => {
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      if (this.shouldCloseOnOpen) {
        this.manualClose = true;
        this.socket?.close(1000, "Client closed");
        return;
      }

      this.pendingSubscriptions.forEach((symbol) => {
        this.sendSubscribe(symbol);
      });

      this.pendingSubscriptions.clear();
    };

    this.socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const parsed: unknown = JSON.parse(event.data);
        onMessage(parsed);
      } catch (err) {
        console.error("Invalid socket JSON:", err);
      }
    };

    this.socket.onerror = () => {
      if (this.manualClose || this.shouldCloseOnOpen) return;
      console.warn("Market socket error");
    };

    this.socket.onclose = (e: CloseEvent) => {
      if (!this.manualClose && !this.shouldCloseOnOpen) {
        console.warn("Market socket closed:", {
          code: e.code,
          reason: e.reason,
          wasClean: e.wasClean,
        });
      }

      this.socket = null;
      this.isConnecting = false;
      this.shouldCloseOnOpen = false;
      this.manualClose = false;
      this.scheduleReconnect();
    };
  }

  subscribe(symbol: string): void {
    const normalized = normalizeSymbol(symbol);
    if (!normalized) return;

    if (!this.socket) {
      this.pendingSubscriptions.add(normalized);
      return;
    }

    if (this.socket.readyState === WebSocket.OPEN) {
      this.sendSubscribe(normalized);
    } else {
      this.pendingSubscriptions.add(normalized);
    }
  }

  unsubscribe(symbol: string): void {
    const normalized = normalizeSymbol(symbol);
    if (!normalized) return;

    this.pendingSubscriptions.delete(normalized);

    if (!this.socket) return;

    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: "unsubscribe",
          market: getMarketBySymbol(normalized),
          symbol: normalized,
        })
      );
    }
  }

  private sendSubscribe(symbol: string): void {
    if (!this.socket) return;

    if (this.socket.readyState !== WebSocket.OPEN) {
      this.pendingSubscriptions.add(symbol);
      return;
    }

    this.socket.send(
        JSON.stringify({
          type: "subscribe",
        market: getMarketBySymbol(symbol),
        symbol,
        depth: 1,
      })
    );
  }

  close(): void {
    if (!this.socket) return;

    if (this.socket.readyState === WebSocket.CONNECTING) {
      this.shouldCloseOnOpen = true;
      this.manualClose = true;
      return;
    }

    if (this.socket.readyState === WebSocket.OPEN) {
      this.manualClose = true;
      this.socket.close(1000, "Client closed");
    }

    this.socket = null;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.pendingSubscriptions.clear();
    this.isConnecting = false;
  }

  private scheduleReconnect() {
    if (this.manualClose || this.shouldCloseOnOpen) return;
    if (!this.lastToken || !this.lastOnMessage) return;
    if (this.reconnectTimer) return;
    if (typeof window === "undefined") return;

    const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.lastToken ?? "", this.lastOnMessage ?? (() => null));
    }, delay);

    if (isMarketSocketDebugEnabled()) {
      console.warn("[MarketSocket] reconnect scheduled", {
        delay,
        baseUrl: this.lastBaseUrl,
      });
    }
  }
}

export function getMarketBySymbol(symbol: string): string {
  const normalized = normalizeSymbol(symbol);
  if (!normalized) return "crypto";

  // Equities only → AllTick stock WS. Gold/forex/crypto use quote-b.
  // Older backends mapped metal/forex → stock WS (seed on reload, no live GOLD ticks).
  if (/\.(US|HK|SH|SZ)$/i.test(normalized)) {
    return "stock";
  }

  return "crypto";
}

export function getAccessTokenFromCookie(): string {
  if (typeof document === "undefined") return "";

  const cookie = document.cookie ?? "";
  const match = cookie.match(/accessToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function isMarketSocketDebugEnabled(): boolean {
  if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams(window.location.search);
      const flag = params.get(WS_DEBUG_QUERY);
      if (flag === "1" || flag === "true") return true;
    } catch {
      // ignore URL parsing issues
    }
    try {
      return window.localStorage.getItem(WS_DEBUG_KEY) === "true";
    } catch {
      // ignore storage access issues
    }
  }
  return process.env.NEXT_PUBLIC_WS_DEBUG === "true";
}

function normalizeSymbol(symbol: string): string {
  return (symbol ?? "").trim().toUpperCase();
}

function normalizeWebSocketUrl(url: string): string {
  if (url.startsWith("ws://") || url.startsWith("wss://")) return url;
  if (url.startsWith("http://")) return `ws://${url.slice("http://".length)}`;
  if (url.startsWith("https://")) return `wss://${url.slice("https://".length)}`;
  if (url.startsWith("//")) {
    const protocol =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "wss:"
        : "ws:";
    return `${protocol}${url}`;
  }
  return url;
}
