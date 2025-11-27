"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import styles from "../login/login.module.css";

export default function ResetPasswordClient() {
    return (
        <Suspense fallback={
            <div className={styles.page}>
                <div className={styles.wrapper}>
                    <div className={styles.formCard}>
                        <div style={{ padding: "2rem", textAlign: "center" }}>
                            <p>Chargement...</p>
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
            setErrorMessage("Lien de réinitialisation invalide ou manquant.");
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
                setErrorMessage(data.error || "Lien expiré ou invalide.");
            }
        } catch (error) {
            console.error("[ResetPassword] Erreur validation token:", error);
            setIsValid(false);
            setErrorMessage("Erreur lors de la validation du lien.");
        } finally {
            setIsValidating(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");

        if (!password || !confirmPassword) {
            setErrorMessage("Veuillez remplir tous les champs.");
            return;
        }

        if (password.length < 8) {
            setErrorMessage("Le mot de passe doit contenir au moins 8 caractères.");
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage("Les mots de passe ne correspondent pas.");
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
                throw new Error(data?.error || "Erreur lors de la réinitialisation.");
            }

            setSuccessMessage("Mot de passe réinitialisé avec succès !");
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
                            <p style={{ color: "var(--text-secondary)" }}>Vérification du lien...</p>
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
                    <BackButton href="/" title="Retour à l'accueil" />
                    <div className={styles.formCard}>
                        <header className={styles.cardHeader}>
                            <div>
                                <h2>Lien invalide</h2>
                                <p className={styles.cardSubhead}>Le lien de réinitialisation est expiré ou invalide.</p>
                            </div>
                        </header>
                        {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}
                        <div className={styles.formFooter}>
                            <p>
                                <Link href="/login/forgot" className={styles.footerLink}>
                                    Demander un nouveau lien
                                </Link>
                            </p>
                            <p style={{ marginTop: "0.5rem" }}>
                                <BackButton href="/login" label="Retour à la connexion" title="Retour à la connexion" />
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
                <BackButton href="/" title="Retour à l'accueil" />
                <div className={styles.formCard}>
                    <header className={styles.cardHeader}>
                        <div>
                            <h2>Réinitialiser le mot de passe</h2>
                            <p className={styles.cardSubhead}>
                                {email && `Pour ${email}`}
                            </p>
                        </div>
                    </header>

                    {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}
                    {successMessage && <div className={styles.successBanner}>{successMessage}</div>}

                    <form className={styles.form} onSubmit={handleSubmit} noValidate>
                        <div className={styles.inputGroup}>
                            <label htmlFor="reset-password">Nouveau mot de passe</label>
                            <input
                                id="reset-password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="reset-confirm-password">Confirmer le mot de passe</label>
                            <input
                                id="reset-confirm-password"
                                name="confirmPassword"
                                type="password"
                                placeholder="••••••••"
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
                                    Réinitialisation...
                                </span>
                            ) : (
                                "Réinitialiser le mot de passe"
                            )}
                        </button>
                    </form>

                    <div className={styles.formFooter}>
                        <p>
                            <BackButton href="/login" label="Retour à la connexion" title="Retour à la connexion" />
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

