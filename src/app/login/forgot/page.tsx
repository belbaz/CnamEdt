// @ts-nocheck
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { useI18n } from "@/i18n/I18nContext";
import styles from "../login.module.css";

export default function ForgotPage() {
    const { t } = useI18n();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");

        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) {
            setErrorMessage(t('forgot.errorEmailRequired'));
            return;
        }

        if (!normalizedEmail.endsWith("@lecnam.net")) {
            setErrorMessage(t('forgot.errorEmailDomain'));
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await fetch("/api/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: normalizedEmail }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || t('forgot.errorSendEmail'));
            }

            setSuccessMessage(t('forgot.successMessage'));
        } catch (error) {
            console.error("[ForgotPassword] Erreur:", error);
            setErrorMessage(error.message);
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.wrapper}>
                <BackButton href="/login" title={t('forgot.backToLogin')} />
                <div className={styles.notice}>
                    <h1>{t('forgot.title')}</h1>
                </div>

                <section className={styles.formsPanel}>
                    <div className={styles.formCard}>
                        {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}
                        {successMessage && <div className={styles.successBanner}>{successMessage}</div>}

                        {!successMessage && (
                            <form className={styles.form} onSubmit={handleSubmit} noValidate>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="forgot-email">{t('forgot.emailLabel')}</label>
                                    <input
                                        id="forgot-email"
                                        name="email"
                                        type="email"
                                        placeholder={t('forgot.emailPlaceholder')}
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <span className={styles.loadingState}>
                                            <span className={styles.loader} aria-hidden="true" />
                                            {t('forgot.submitting')}
                                        </span>
                                    ) : (
                                        t('forgot.submit')
                                    )}
                                </button>
                            </form>
                        )}

                        {successMessage && (
                            <div className={styles.successActions}>
                                <div className={styles.actionGroup}>
                                    <a
                                        href="https://outlook.office365.com/?realm=lecnam.net&modurl=0"
                                        className={styles.submitButton}
                                        style={{ display: "inline-block", textDecoration: "none" }}
                                    >
                                        {t('forgot.openOutlook')}
                                    </a>
                                </div>
                                <div className={styles.contactSection}>
                                    <Link
                                        href="/contact?from=forgot-password"
                                        className={styles.contactButton}
                                    >
                                        <span>✉️</span>
                                        {t('common.contact')}
                                    </Link>
                                    <p className={styles.contactHint}>
                                        {t('forgot.contactIfNoEmail')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}


