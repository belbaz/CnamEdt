// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import {useI18n} from "@/i18n/I18nContext";
import styles from "./login.module.css";

const LOG_PREFIX = "[LoginForm]";

export default function LoginForm({ onSuccess, embedded = false }) {
    const { t } = useI18n();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [redirectTimer, setRedirectTimer] = useState(null);
    const [isAlreadyLoggedIn, setIsAlreadyLoggedIn] = useState(false);
    const [userInfo, setUserInfo] = useState(null);
    const [checkingAuth, setCheckingAuth] = useState(true);

    // Vérifier si l'utilisateur est déjà connecté
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch("/api/user", { cache: "no-store" });
                if (response.ok) {
                    const data = await response.json();
                    setUserInfo(data);
                    setIsAlreadyLoggedIn(true);
                } else {
                    setIsAlreadyLoggedIn(false);
                }
            } catch (error) {
                setIsAlreadyLoggedIn(false);
            } finally {
                setCheckingAuth(false);
            }
        };
        checkAuth();
    }, []);

    useEffect(() => {
        return () => {
            if (redirectTimer) {
                clearTimeout(redirectTimer);
            }
        };
    }, [redirectTimer]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");

        const normalizedEmail = email.trim().toLowerCase();
        // désactivation de l'obligation d'avoir un mail avec @lecnam.net
        /*
        // Accepter soit "admin" soit "test" soit une adresse @lecnam.net
        if (normalizedEmail !== "admin" && normalizedEmail !== "test" && !normalizedEmail.endsWith("@lecnam.net")) {
            setErrorMessage(t('login.errorEmail'));
            return;
        }
        */

        if (!password) {
            setErrorMessage(t('login.errorPassword'));
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: normalizedEmail, password }),
            });

            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload?.error || t('login.errorConnection'));
            }

            if (onSuccess) {
                setSuccessMessage(t('login.success'));
                // Si une callback est fournie (ex: rechargement des données), on l'appelle
                // et on laisse le composant parent gérer la suite (ou pas de redirection)
                await onSuccess();
                setIsSubmitting(false);
            } else {
                // Comportement par défaut : redirection
                // On ne met PAS setIsSubmitting(false) ici pour garder l'état de chargement
                // On passe en mode redirection
                setIsRedirecting(true);

                // Récupérer l'URL de redirection depuis les paramètres de l'URL
                const redirectTo = searchParams.get('redirect');
                // Décoder l'URL et valider qu'elle est relative (sécurité)
                let targetPath = "/dashboard"; // Par défaut vers le dashboard
                
                if (redirectTo) {
                    try {
                        const decodedPath = decodeURIComponent(redirectTo);
                        // Vérifier que c'est un chemin relatif (sécurité contre les redirections malveillantes)
                        if (decodedPath.startsWith('/') && !decodedPath.startsWith('//')) {
                            targetPath = decodedPath;
                        }
                    } catch (e) {
                        console.warn(`${LOG_PREFIX} Erreur décodage redirect:`, e);
                    }
                }

                const timer = setTimeout(() => {
                    router.replace(targetPath);
                }, 1200);
                setRedirectTimer(timer);
            }
        } catch (error) {
            console.warn(`${LOG_PREFIX} Connexion échouée`, error);
            setErrorMessage(error.message);
            setIsSubmitting(false);
        }
    };

    // Si déjà connecté, afficher un message avec lien vers le dashboard
    if (checkingAuth) {
        return (
            <div className={styles.page}>
                <div className={styles.wrapper}>
                    <div className={styles.formCard}>
                        <div style={{ padding: "2rem", textAlign: "center" }}>
                            <div className={styles.loadingState} style={{ justifyContent: "center", marginBottom: "1rem" }}>
                                <div className={styles.loader}></div>
                            </div>
                            <p style={{ color: "var(--text-secondary)" }}>{t('login.loadingSession')}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isAlreadyLoggedIn && userInfo) {
        return (
            <div className={styles.page}>
                <div className={styles.wrapper}>
                    <div className={styles.formCard}>
                        <header className={styles.cardHeader}>
                            <div>
                                <h2>{t('login.alreadyLoggedIn')}</h2>
                                <p className={styles.cardSubhead}>
                                    {t('login.hello')} {userInfo.name} {userInfo.lastName}
                                </p>
                            </div>
                        </header>
                        <div style={{ padding: "1.5rem", textAlign: "center" }}>
                            <div style={{ marginBottom: "1.5rem" }}>
                                <p style={{ marginBottom: "1rem", color: "var(--text-secondary)" }}>
                                    {t('login.alreadyLoggedInText')}
                                </p>
                                <p style={{ marginBottom: "1.5rem", color: "var(--text-secondary)" }}>
                                    {t('login.alreadyLoggedInText2')}
                                </p>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                <button
                                    onClick={() => router.push("/")}
                                    className={styles.submitButton}
                                    style={{ width: "100%" }}
                                >
                                    {t('login.goToEDT')}
                                </button>
                                <button
                                    onClick={() => router.push("/dashboard")}
                                    className={styles.submitButton}
                                    style={{ 
                                        width: "100%",
                                        background: "var(--bg-tertiary)",
                                        color: "var(--text-primary)",
                                        border: "1px solid var(--border-color)"
                                    }}
                                >
                                    {t('login.goToDashboard')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const formContent = (
        <>
            {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}
            {successMessage && <div className={styles.successBanner}>{successMessage}</div>}

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
                <div className={styles.inputGroup}>
                    <label htmlFor="login-email">{t('login.emailLabel')}</label>
                    <input
                        id="login-email"
                        name="email"
                        type="email"
                        placeholder={t('login.emailPlaceholder')}
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="login-password">{t('login.passwordLabel')}</label>
                    <div className={styles.passwordInputWrapper}>
                        <input
                            id="login-password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder={t('login.passwordPlaceholder')}
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)}
                            className={styles.passwordToggle}
                            aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                            title={showPassword ? t('hidePassword') : t('showPassword')}
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="20" height="20"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="20" height="20"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                <div className={styles.inlineActions}>
                    <Link href="/login/forgot" className={styles.ghostLink}>
                        {t('login.forgotPassword')}
                    </Link>
                </div>

                <button type="submit" className={styles.submitButton} disabled={isSubmitting || isRedirecting}>
                    {isSubmitting || isRedirecting ? (
                        <span className={styles.loadingState}>
                            <span className={styles.loader} aria-hidden="true" />
                            {isRedirecting ? t('login.redirecting') : t('login.connecting')}
                        </span>
                    ) : (
                        t('login.submit')
                    )}
                </button>
            </form>

            <div className={styles.formFooter}>
                <p>
                    {t('login.noAccount')}{" "}
                    <Link href="/signup" className={styles.footerLink}>
                        {t('login.createAccount')}
                    </Link>
                </p>
            </div>

            <div className={styles.testAccessLink}>
                <Link href="/contact?from=login-demo" className={styles.testLink}>
                    {t('signup.requestDemo')}
                </Link>
            </div>
        </>
    );

    if (embedded) {
        return (
            <div className={styles.embeddedWrapper}>
                {formContent}
            </div>
        );
    }

    return (
            <div className={styles.page}>
            <div className={styles.wrapper}>
                <BackButton href="/" title={t('login.backToHome')} />
                <div className={styles.formCard}>
                    <header className={styles.cardHeader}>
                        <div>
                            <h2>{t('login.title')}</h2>
                            <p className={styles.cardSubhead}> </p>
                        </div>
                    </header>
                    {formContent}
                </div>
            </div>
        </div>
    );
}



