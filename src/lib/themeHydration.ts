/** Cookies de session (sans Max-Age) pour le thème — OLED prioritaire sur clair/sombre. */

const DARK_COOKIE_RE = /(?:^|; )darkMode=([^;]+)/;
const OLED_COOKIE_RE = /(?:^|; )oledMode=([^;]+)/;

function readOledCookieFlag(): string | null {
    if (typeof document === "undefined") return null;
    const m = document.cookie.match(OLED_COOKIE_RE);
    return m ? decodeURIComponent(m[1]) : null;
}

function readDarkCookieFlag(): string | null {
    if (typeof document === "undefined") return null;
    const m = document.cookie.match(DARK_COOKIE_RE);
    return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Préférence OLED : cookie de session prioritaire sur localStorage.
 * - `oledMode=true` → OLED actif
 * - `oledMode=false` → OLED explicite désactivé (ignore localStorage OLED)
 * - absent → repli sur localStorage `oledMode`
 */
export function wantsOledFromStorage(): boolean {
    if (typeof window === "undefined") return false;
    try {
        const c = readOledCookieFlag();
        if (c === "true") return true;
        if (c === "false") return false;
        return localStorage.getItem("oledMode") === "true";
    } catch {
        return false;
    }
}

export function wantsDarkFromStorage(): boolean {
    if (typeof window === "undefined") return false;
    try {
        const fromCookie = readDarkCookieFlag();
        if (fromCookie != null) return fromCookie === "true";
        return localStorage.getItem("darkMode") === "true";
    } catch {
        return false;
    }
}

/** OLED impose le thème sombre ; sinon clair/sombre classique. */
export function resolveThemeFromBrowser(): { dark: boolean; oled: boolean } {
    if (typeof window === "undefined") return { dark: false, oled: false };
    try {
        if (wantsOledFromStorage()) {
            return { dark: true, oled: true };
        }
        return { dark: wantsDarkFromStorage(), oled: false };
    } catch {
        return { dark: false, oled: false };
    }
}

export function applyDocumentThemeClasses(dark: boolean, oled: boolean): void {
    const root = document.documentElement;
    if (dark) root.classList.add("dark-mode");
    else root.classList.remove("dark-mode");
    if (oled && dark) root.classList.add("oled-mode");
    else root.classList.remove("oled-mode");
}

export function applyThemeFromBrowserStorage(): void {
    const { dark, oled } = resolveThemeFromBrowser();
    applyDocumentThemeClasses(dark, oled);
}

export function setOledSessionCookie(active: boolean): void {
    if (typeof document === "undefined") return;
    try {
        if (active) {
            document.cookie = "oledMode=true; path=/; SameSite=Lax";
        } else {
            document.cookie = "oledMode=; Max-Age=0; path=/; SameSite=Lax";
        }
    } catch {
        /* ignore */
    }
}
