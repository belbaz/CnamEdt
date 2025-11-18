"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./signup.module.css";

const LOG_PREFIX = "[SignupForm]";

export default function SignupForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [activationToken, setActivationToken] = useState("");

    const resetForm = () => {
        setEmail("");
        setPassword("");
        setConfirmPassword("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrorMessage("");

        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail.endsWith("@lecnam.net")) {
            setErrorMessage("Utilisez uniquement une adresse @lecnam.net.");
            return;
        }

        if (password.length < 10) {
            setErrorMessage("Le mot de passe doit contenir au moins 10 caractères.");
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage("Les mots de passe ne correspondent pas.");
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await fetch("/api/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: normalizedEmail, password }),
            });

            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload?.error || "Création impossible, réessayez plus tard.");
            }

            setActivationToken(payload.activationToken || "");
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
                <div className={styles.notice}>
                    <h1>Accès réservé aux comptes Cnam</h1>
                    <p>Identifiez-vous pour ajouter des cours dans l&apos;agenda partagé.</p>
                </div>

                <div className={`${styles.formCard} ${styles.accentCard}`}>
                    <header className={styles.cardHeader}>
                        <div>
                            <h2>Créer un compte</h2>
                            <p className={styles.cardSubhead}>Adresse @lecnam.net requise</p>
                        </div>
                        <a href="https://outlook.office365.com/?realm=lecnam.net&modurl=0" className={styles.quickLink}>
                            Ouvrir Outlook
                        </a>
                    </header>

                    {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}

                    <form className={styles.form} onSubmit={handleSubmit} noValidate>
                        <div className={styles.inputGroup}>
                            <label htmlFor="signup-email">Adresse @lecnam.net</label>
                            <input
                                id="signup-email"
                                name="signupEmail"
                                type="email"
                                placeholder="prenom.nom@lecnam.net"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className={styles.dualRow}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="signup-password">Mot de passe</label>
                                <input
                                    id="signup-password"
                                    name="signupPassword"
                                    type="password"
                                    placeholder="••••••••••"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <small className={styles.inputHint}>10 caractères minimum</small>
                            </div>
                            <div className={styles.inputGroup}>
                                <label htmlFor="signup-confirm">Confirmation</label>
                                <input
                                    id="signup-confirm"
                                    name="signupConfirm"
                                    type="password"
                                    placeholder="••••••••••"
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className={`${styles.submitButton} ${styles.accentButton}`} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <span className={styles.loadingState}>
                                    <span className={styles.loader} aria-hidden="true" />
                                    Création en cours...
                                </span>
                            ) : (
                                "Créer mon compte"
                            )}
                        </button>
                    </form>

                    <div className={styles.formFooter}>
                        <p>
                            Déjà un compte ?{" "}
                            <Link href="/login" className={styles.footerLink}>
                                Se connecter
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {isSuccess && (
                <div className={styles.successOverlay} role="alert">
                    <div className={styles.successCard}>
                        <h3>Compte créé 🎉</h3>
                        <p>
                            Consultez votre messagerie @lecnam.net pour activer votre compte.
                            Tant que le lien n&apos;est pas confirmé, l&apos;accès reste bloqué.
                        </p>
                        {activationToken && (
                            <Link
                                href={`/activeAccount?token=${encodeURIComponent(activationToken)}`}
                                className={styles.quickLink}
                            >
                                Activer maintenant
                            </Link>
                        )}
                        <div className={styles.buttonRow}>
                            <button type="button" className={styles.ghostButton} onClick={() => setIsSuccess(false)}>
                                Continuer
                            </button>
                            <Link href="/login" className={styles.submitButton}>
                                Aller à la connexion
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


