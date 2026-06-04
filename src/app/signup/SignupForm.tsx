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
                                <input
                                    id="signup-password"
                                    name="signupPassword"
                                    type="password"
                                    placeholder={t('signup.passwordPlaceholder')}
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <small className={styles.inputHint}>{t('signup.passwordHint')}</small>
                            </div>
                            <div className={styles.inputGroup}>
                                <label htmlFor="signup-confirm">{t('signup.confirmLabel')}</label>
                                <input
                                    id="signup-confirm"
                                    name="signupConfirm"
                                    type="password"
                                    placeholder={t('signup.confirmPlaceholder')}
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
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



