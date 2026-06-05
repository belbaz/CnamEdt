// @ts-nocheck
"use client";

import {useState} from "react";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import {useI18n} from "@/i18n/I18nContext";
import styles from "./signup.module.css";

const LOG_PREFIX = "[SignupForm]";

export default function SignupForm() {
    const { t } = useI18n();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const resetForm = () => {
        setEmail("");
        setPassword("");
        setConfirmPassword("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrorMessage("");

        const normalizedEmail = email.trim().toLowerCase();

        // désactivation de l'obligation d'avoir un mail avec @lecnam.net
        /*
        if (!normalizedEmail.endsWith("@lecnam.net")) {
            setErrorMessage(t('signup.errorEmail'));
            return;
        }
        */

        if (password.length < 6) {
            setErrorMessage(t('signup.errorPasswordLength'));
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage(t('signup.errorPasswordMatch'));
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await fetch("/api/signup", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email: normalizedEmail, password}),
            });

            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload?.error || t('signup.errorCreation'));
            }

            setIsSuccess(true);
            resetForm();
        } catch (error) {
            console.warn(`${LOG_PREFIX} Signup échoué`, error);
            setErrorMessage(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.wrapper}>
                <BackButton href="/" title={t('backToHome')} />
                <div className={styles.notice}>
                    <h1>{t('signup.noticeTitle')}</h1>
                    <p>{t('signup.noticeText')}</p>
                </div>

                <div className={[styles.formCard, styles.accentCard].filter(Boolean).join(' ')}>
                    <header className={styles.cardHeader}>
                        <div>
                            <h2>{t('signup.title')}</h2>
                        </div>
                    </header>

                    {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}

                    <form className={styles.form} onSubmit={handleSubmit} noValidate>
                        <div className={styles.inputGroup}>
                            <label htmlFor="signup-email">{t('signup.emailLabel')}</label>
                            <input
                                id="signup-email"
                                name="signupEmail"
                                type="email"
                                placeholder={t('signup.emailPlaceholder')}
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className={styles.dualRow}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="signup-password">{t('signup.passwordLabel')}</label>
                                <div className={styles.passwordInputWrapper}>
                                    <input
                                        id="signup-password"
                                        name="signupPassword"
                                        type={showPassword ? "text" : "password"}
                                        placeholder={t('signup.passwordPlaceholder')}
                                        autoComplete="new-password"
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
                                <small className={styles.inputHint}>{t('signup.passwordHint')}</small>
                            </div>
                            <div className={styles.inputGroup}>
                                <label htmlFor="signup-confirm">{t('signup.confirmLabel')}</label>
                                <div className={styles.passwordInputWrapper}>
                                    <input
                                        id="signup-confirm"
                                        name="signupConfirm"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder={t('signup.confirmPlaceholder')}
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className={styles.passwordToggle}
                                        aria-label={showConfirmPassword ? t('hidePassword') : t('showPassword')}
                                        title={showConfirmPassword ? t('hidePassword') : t('showPassword')}
                                    >
                                        {showConfirmPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="20" height="20"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="20" height="20"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className={[styles.submitButton, styles.accentButton].filter(Boolean).join(' ')}
                                disabled={isSubmitting}>
                            {isSubmitting ? (
                                <span className={styles.loadingState}>
                                    <span className={styles.loader} aria-hidden="true"/>
                                    {t('signup.creating')}
                                </span>
                            ) : (
                                t('signup.submit')
                            )}
                        </button>
                    </form>

                    <div className={styles.formFooter}>
                        <p>
                            {t('signup.alreadyAccount')}{" "}
                            <Link href="/login" className={styles.footerLink}>
                                {t('signup.signIn')}
                            </Link>
                        </p>
                    </div>

                    <div className={styles.testAccessLink}>
                        <Link href="/contact?from=signup-demo" className={styles.testLink}>
                            {t('signup.requestDemo')}
                        </Link>
                    </div>
                </div>
            </div>

            {isSuccess && (
                <div className={styles.successOverlay} role="alert">
                    <div className={styles.successCard}>
                        <h3>{t('signup.successTitle')}</h3>
                        <p>
                            {t('signup.successText')}
                        </p>
                        <div className={styles.buttonRow}>
                            <a href="https://outlook.office365.com/?realm=lecnam.net&modurl=0"
                               className={styles.quickLink}>
                                {t('signup.openOutlook')}
                            </a>
                            <Link href="/login" className={styles.submitButton}>
                                {t('signup.goToLogin')}
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}



