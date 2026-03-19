// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import styles from "../login/login.module.css";
import KeepAlive from "@/components/KeepAlive";
import { useI18n } from "@/i18n/I18nContext";

/**
 * Page centrale Galao :
 * - gère la connexion (login Galao)
 * - propose ensuite le choix Notes / Absences
 */
export default function GalaoClient() {
    const router = useRouter();
    const { t } = useI18n();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [errorMessage, setErrorMessage] = useState("");
    const [infoMessage, setInfoMessage] = useState("");
    const [hasExistingSession, setHasExistingSession] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Détection d'une session existante (cookie galao_client posé par /api/galao/login)
    useEffect(() => {
        if (typeof document === "undefined") return;
        const hasClientFlag = document.cookie.split(";").some((c) =>
            c.trim().startsWith("galao_client="),
        );
        if (hasClientFlag) {
            setHasExistingSession(true);
            setIsLoggedIn(true);
            setInfoMessage(t('galao.portal.loginSuccess'));
        }
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrorMessage("");
        setInfoMessage("");

        if (!username.trim() || !password.trim()) {
            setErrorMessage(t('galao.notes.missingCredentials'));
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await fetch("/api/galao/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const payload = await response.json();

            if (!response.ok || !payload?.success) {
                throw new Error(payload?.error || t('galao.notes.connectionFailed'));
            }

            setIsLoggedIn(true);
            setHasExistingSession(true);
            setInfoMessage(t('galao.portal.loginSuccess'));
        } catch (err) {
            setErrorMessage(err.message || t('galao.notes.loginError'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoNotes = () => {
        // Marquer dans sessionStorage qu'on vient de /galao
        if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem("from_galao", "true");
        }
        router.push("/note");
    };

    const handleGoAbsences = () => {
        // Marquer dans sessionStorage qu'on vient de /galao
        if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem("from_galao", "true");
        }
        router.push("/absences");
    };

    const handleLogout = async () => {
        setErrorMessage("");
        setInfoMessage("");
        setIsLoggedIn(false);
        setHasExistingSession(false);

        try {
            await fetch("/api/galao/logout", { method: "POST" });
            if (typeof document !== "undefined") {
                document.cookie = "galao_client=; Max-Age=0; path=/";
            }
            setInfoMessage(t('galao.notes.logoutSuccess'));
        } catch (err) {
            console.warn("[Galao] Erreur lors de la déconnexion", err);
        }
    };

    return (
        <div className={styles.page}>
            {/* KeepAlive pour maintenir la session Galao active */}
            {isLoggedIn && <KeepAlive />}
            
            <div className={styles.notePage}>
                <BackButton href="/" title="Retour à l'emploi du temps" />

                <div className={styles.formCard}>
                    <header className={styles.cardHeader}>
                        <div style={{ flex: 1 }}>
                            <h2>{t('galao.portal.title')}</h2>
                            <p 
                                className={styles.cardSubhead}
                                dangerouslySetInnerHTML={{ __html: t('galao.portal.subtitle') }}
                            />
                        </div>
                        {isLoggedIn && (
                            <button
                                onClick={handleLogout}
                                className={styles.logoutButton}
                                style={{ alignSelf: 'flex-start' }}
                            >
                                {t('galao.portal.logoutButton')}
                            </button>
                        )}
                    </header>

                    {!isLoggedIn && (
                        <>
                            {errorMessage && (
                                <div className={styles.errorBanner}>{errorMessage}</div>
                            )}
                            {infoMessage && (
                                <div className={styles.successBanner}>{infoMessage}</div>
                            )}

                            <form className={styles.form} onSubmit={handleSubmit}>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="galao-username">{t('galao.portal.usernameLabel')}</label>
                                    <input
                                        id="galao-username"
                                        type="text"
                                        autoComplete="username"
                                        placeholder={t('galao.portal.usernamePlaceholder')}
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div className={styles.inputGroup}>
                                    <label htmlFor="galao-password">{t('galao.portal.passwordLabel')}</label>
                                    <input
                                        id="galao-password"
                                        type="password"
                                        autoComplete="current-password"
                                        placeholder={t('galao.portal.passwordPlaceholder')}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className={styles.submitButton}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? t('galao.portal.loggingIn') : t('galao.portal.loginButton')}
                                </button>
                            </form>

                            <div className={styles.formFooter}>
                                <p>
                                    {t('galao.portal.privacyNote')}
                                </p>
                            </div>
                        </>
                    )}

                    {isLoggedIn && (
                        <div>
                            {/* Message de succès */}
                            {infoMessage && (
                                <div
                                    className={styles.successBanner}
                                    style={{ marginBottom: "0.75rem" }}
                                >
                                    {infoMessage}
                                </div>
                            )}

                            {/* Boutons Notes et Absences en ligne */}
                            <div style={{
                                display: 'flex',
                                gap: '1rem',
                                flexWrap: 'wrap'
                            }}>
                                {/* Bouton Notes */}
                                <button
                                    type="button"
                                    onClick={handleGoNotes}
                                    style={{
                                        all: 'unset',
                                        cursor: 'pointer',
                                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(37, 99, 235, 0.08))',
                                        border: '2px solid rgba(59, 130, 246, 0.2)',
                                        borderRadius: '14px',
                                        padding: '1rem 1.25rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.85rem',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                                        flex: '1',
                                        minWidth: '200px'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-3px)';
                                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.18)';
                                        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(37, 99, 235, 0.12))';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                                        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(37, 99, 235, 0.08))';
                                    }}
                                >
                                    <div style={{
                                        width: '52px',
                                        height: '52px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.6rem',
                                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                                        flexShrink: 0
                                    }}>
                                        📊
                                    </div>
                                    <div style={{ textAlign: 'left', flex: 1 }}>
                                        <h3 style={{
                                            margin: 0,
                                            fontSize: '0.95rem',
                                            fontWeight: '700',
                                            color: 'var(--text-primary)',
                                            marginBottom: '0.2rem'
                                        }}>
                                            {t('galao.choices.notes.title')}
                                        </h3>
                                        <p style={{
                                            margin: 0,
                                            fontSize: '0.75rem',
                                            color: 'var(--text-secondary)',
                                            lineHeight: '1.3'
                                        }}>
                                            {t('galao.choices.notes.description')}
                                        </p>
                                    </div>
                                    <svg 
                                        width="18" 
                                        height="18" 
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2"
                                        style={{ color: '#3b82f6', flexShrink: 0 }}
                                    >
                                        <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>

                                {/* Bouton Absences */}
                                <button
                                    type="button"
                                    onClick={handleGoAbsences}
                                    style={{
                                        all: 'unset',
                                        cursor: 'pointer',
                                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(251, 146, 60, 0.08))',
                                        border: '2px solid rgba(245, 158, 11, 0.2)',
                                        borderRadius: '14px',
                                        padding: '1rem 1.25rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.85rem',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                                        flex: '1',
                                        minWidth: '200px'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-3px)';
                                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(245, 158, 11, 0.18)';
                                        e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)';
                                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(251, 146, 60, 0.12))';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                                        e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.2)';
                                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(251, 146, 60, 0.08))';
                                    }}
                                >
                                    <div style={{
                                        width: '52px',
                                        height: '52px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #f59e0b, #fb923c)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.6rem',
                                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                                        flexShrink: 0
                                    }}>
                                        🕒
                                    </div>
                                    <div style={{ textAlign: 'left', flex: 1 }}>
                                        <h3 style={{
                                            margin: 0,
                                            fontSize: '0.95rem',
                                            fontWeight: '700',
                                            color: 'var(--text-primary)',
                                            marginBottom: '0.2rem'
                                        }}>
                                            {t('galao.choices.absences.title')}
                                        </h3>
                                        <p style={{
                                            margin: 0,
                                            fontSize: '0.75rem',
                                            color: 'var(--text-secondary)',
                                            lineHeight: '1.3'
                                        }}>
                                            {t('galao.choices.absences.description')}
                                        </p>
                                    </div>
                                    <svg 
                                        width="18" 
                                        height="18" 
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2"
                                        style={{ color: '#f59e0b', flexShrink: 0 }}
                                    >
                                        <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


