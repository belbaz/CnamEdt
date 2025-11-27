"use client";

import {useState} from "react";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import styles from "./signup.module.css";

const LOG_PREFIX = "[SignupForm]";

export default function SignupForm() {
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

        if (!normalizedEmail.endsWith("@lecnam.net")) {
            setErrorMessage("Utilisez uniquement une adresse @lecnam.net");
            return;
        }

        if (password.length < 6) {
            setErrorMessage("Le mot de passe doit contenir au moins 6 caractères.");
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
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email: normalizedEmail, password}),
            });

            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload?.error || "Création impossible, réessayez plus tard.");
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
                <BackButton href="/" title="Retour à l'accueil" />
                <div className={styles.notice}>
                    <h1>Accès réservé aux comptes Cnam</h1>
                    <p>Créer un compte pour ajouter des cours dans l&apos;agenda</p>
                </div>

                <div className={`${styles.formCard} ${styles.accentCard}`}>
                    <header className={styles.cardHeader}>
                        <div>
                            <h2>Créer un compte</h2>
                        </div>
                    </header>

                    {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}

                    <form className={styles.form} onSubmit={handleSubmit} noValidate>
                        <div className={styles.inputGroup}>
                            <label htmlFor="signup-email">Adresse @lecnam.net</label>
                            <input
                                id="signup-email"
                                name="signupEmail"
                                type="email"
                                placeholder="prenom.nom.auditeur@lecnam.net"
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
                                <small className={styles.inputHint}>6 caractères minimum</small>
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

                        <button type="submit" className={`${styles.submitButton} ${styles.accentButton}`}
                                disabled={isSubmitting}>
                            {isSubmitting ? (
                                <span className={styles.loadingState}>
                                    <span className={styles.loader} aria-hidden="true"/>
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
                        <h3>Compte créé avec succès</h3>
                        <p>
                            Vérifiez votre messagerie @lecnam.net afin d&apos;activer votre compte.
                            L&apos;email d&apos;activation peut mettre jusqu&apos;à 3 minutes pour arriver.
                        </p>
                        <div className={styles.buttonRow}>
                            <a href="https://outlook.office365.com/?realm=lecnam.net&modurl=0"
                               className={styles.quickLink}>
                                Ouvrir Outlook
                            </a>
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


