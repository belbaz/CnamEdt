/**
 * Mémorise la page censée suivre après reconnexion sur /galao (notes ou absences).
 */

export type GalaoPostLoginPath = "/note" | "/absences";

export const GALAO_POST_LOGIN_REDIRECT_KEY = "galao_post_login_redirect";

const ALLOWED = new Set<string>(["/note", "/absences"]);

export function setGalaoPostLoginRedirect(path: GalaoPostLoginPath): void {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(GALAO_POST_LOGIN_REDIRECT_KEY, path);
}

/** Lit sans consommer (affichage sur le formulaire du portail). */
export function peekGalaoPostLoginRedirect(): GalaoPostLoginPath | null {
    if (typeof sessionStorage === "undefined") return null;
    const v = sessionStorage.getItem(GALAO_POST_LOGIN_REDIRECT_KEY);
    return v && ALLOWED.has(v) ? (v as GalaoPostLoginPath) : null;
}

/** Lit puis supprime une seule utilisation après login réussi. */
export function consumeGalaoPostLoginRedirect(): GalaoPostLoginPath | null {
    if (typeof sessionStorage === "undefined") return null;
    const v = sessionStorage.getItem(GALAO_POST_LOGIN_REDIRECT_KEY);
    if (!v) return null;
    sessionStorage.removeItem(GALAO_POST_LOGIN_REDIRECT_KEY);
    return ALLOWED.has(v) ? (v as GalaoPostLoginPath) : null;
}
