"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { useI18n } from "@/i18n/I18nContext";
import styles from "../login/login.module.css";

export default function ResetPasswordClient() {
    const { t } = useI18n();
    return (
        <Suspense fallback={
            <div className={styles.page}>
                <div className={styles.wrapper}>
                    <div className={styles.formCard}>
                        <div style={{ padding: "2rem", textAlign: "center" }}>
                            <p>{t('resetPassword.loading')}</p>
                        </div>
                    </div>
                </div>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}

function ResetPasswordForm() {
    const { t } = useI18n();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [token, setToken] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isValidating, setIsValidating] = useState(true);
    const [isValid, setIsValid] = useState(false);
    const [email, setEmail] = useState("");

    useEffect(() => {
        const tokenParam = searchParams?.get("token");
        if (tokenParam) {
            setToken(tokenParam);
            validateToken(tokenParam);
        } else {
            setIsValidating(false);
            setErrorMessage(t('resetPassword.errorTokenMissing'));
        }
    }, [searchParams]);

    const validateToken = async (tokenToValidate) => {
        try {
            const response = await fetch("/api/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: tokenToValidate, action: "validate" }),
            });

            const data = await response.json();

            if (response.ok && data.valid) {
                setIsValid(true);
                setEmail(data.email || "");
            } else {
                setIsValid(false);
                setErrorMessage(data.error || t('resetPassword.errorTokenExpired'));
            }
        } catch (error) {
            console.error("[ResetPassword] Erreur validation token:", error);
            setIsValid(false);
            setErrorMessage(t('resetPassword.errorValidation'));
        } finally {
            setIsValidating(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");

        if (!password || !confirmPassword) {
            setErrorMessage(t('resetPassword.errorAllFields'));
            return;
        }

        if (password.length < 8) {
            setErrorMessage(t('resetPassword.errorMinLength'));
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage(t('resetPassword.errorPasswordMatch'));
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await fetch("/api/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || t('resetPassword.errorReset'));
            }

            setSuccessMessage(t('resetPassword.success'));
            setTimeout(() => {
                router.push("/login");
            }, 2000);
        } catch (error) {
            console.error("[ResetPassword] Erreur réinitialisation:", error);
            setErrorMessage(error.message);
            setIsSubmitting(false);
        }
    };

    if (isValidating) {
        return (
            <div className={styles.page}>
                <div className={styles.wrapper}>
                    <div className={styles.formCard}>
                        <div style={{ padding: "2rem", textAlign: "center" }}>
                            <div className={styles.loadingState} style={{ justifyContent: "center", marginBottom: "1rem" }}>
                                <div className={styles.loader}></div>
                            </div>
                            <p style={{ color: "var(--text-secondary)" }}>{t('resetPassword.validating')}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isValid) {
        return (
            <div className={styles.page}>
                <div className={styles.wrapper}>
                    <BackButton href="/" title={t('resetPassword.backToHome')} />
                    <div className={styles.formCard}>
                        <header className={styles.cardHeader}>
                            <div>
                                <h2>{t('resetPassword.invalidLinkTitle')}</h2>
                                <p className={styles.cardSubhead}>{t('resetPassword.invalidLinkMessage')}</p>
                            </div>
                        </header>
                        {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}
                        <div className={styles.formFooter}>
                            <p>
                                <Link href="/login/forgot" className={styles.footerLink}>
                                    {t('resetPassword.requestNewLink')}
                                </Link>
                            </p>
                            <p style={{ marginTop: "0.5rem" }}>
                                <BackButton href="/login" label={t('resetPassword.backToLogin')} title={t('resetPassword.backToLogin')} />
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.wrapper}>
                <BackButton href="/" title={t('resetPassword.backToHome')} />
                <div className={styles.formCard}>
                    <header className={styles.cardHeader}>
                        <div>
                            <h2>{t('resetPassword.title')}</h2>
                            <p className={styles.cardSubhead}>
                                {email && t('resetPassword.forEmail').replace('{email}', email)}
                            </p>
                        </div>
                    </header>

                    {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}
                    {successMessage && <div className={styles.successBanner}>{successMessage}</div>}

                    <form className={styles.form} onSubmit={handleSubmit} noValidate>
                        <div className={styles.inputGroup}>
                            <label htmlFor="reset-password">{t('resetPassword.newPasswordLabel')}</label>
                            <input
                                id="reset-password"
                                name="password"
                                type="password"
                                placeholder={t('resetPassword.passwordPlaceholder')}
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="reset-confirm-password">{t('resetPassword.confirmPasswordLabel')}</label>
                            <input
                                id="reset-confirm-password"
                                name="confirmPassword"
                                type="password"
                                placeholder={t('resetPassword.passwordPlaceholder')}
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>

                        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <span className={styles.loadingState}>
                                    <span className={styles.loader} aria-hidden="true" />
                                    {t('resetPassword.submitting')}
                                </span>
                            ) : (
                                t('resetPassword.submit')
                            )}
                        </button>
                    </form>

                    <div className={styles.formFooter}>
                        <p>
                            <BackButton href="/login" label={t('resetPassword.backToLogin')} title={t('resetPassword.backToLogin')} />
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

