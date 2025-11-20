"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./login.module.css";

const LOG_PREFIX = "[LoginForm]";

export default function LoginForm({ onSuccess, embedded = false }) {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [redirectTimer, setRedirectTimer] = useState(null);

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
        if (!normalizedEmail.endsWith("@lecnam.net")) {
            setErrorMessage("Connectez-vous uniquement avec une adresse @lecnam.net.");
            return;
        }

        if (!password) {
            setErrorMessage("Le mot de passe est requis.");
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
                throw new Error(payload?.error || "Connexion impossible. Réessayez plus tard.");
            }

            if (onSuccess) {
                setSuccessMessage("Connexion réussie !");
                // Si une callback est fournie (ex: rechargement des données), on l'appelle
                // et on laisse le composant parent gérer la suite (ou pas de redirection)
                await onSuccess();
                setIsSubmitting(false);
            } else {
                // Comportement par défaut : redirection
                // On ne met PAS setIsSubmitting(false) ici pour garder l'état de chargement
                // On passe en mode redirection
                setIsRedirecting(true);

                const timer = setTimeout(() => {
                    router.replace("/agenda");
                }, 1200);
                setRedirectTimer(timer);
            }
        } catch (error) {
            console.warn(`${LOG_PREFIX} Connexion échouée`, error);
            setErrorMessage(error.message);
            setIsSubmitting(false);
        }
    };

    const formContent = (
        <>
            {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}
            {successMessage && <div className={styles.successBanner}>{successMessage}</div>}

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
                <div className={styles.inputGroup}>
                    <label htmlFor="login-email">Adresse e-mail</label>
                    <input
                        id="login-email"
                        name="email"
                        type="email"
                        placeholder="prenom.nom@lecnam.net"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="login-password">Mot de passe</label>
                    <input
                        id="login-password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <div className={styles.inlineActions}>
                    <Link href="/login/forgot" className={styles.ghostLink}>
                        Mot de passe oublié ?
                    </Link>
                </div>

                <button type="submit" className={styles.submitButton} disabled={isSubmitting || isRedirecting}>
                    {isSubmitting || isRedirecting ? (
                        <span className={styles.loadingState}>
                            <span className={styles.loader} aria-hidden="true" />
                            {isRedirecting ? "Redirection..." : "Connexion..."}
                        </span>
                    ) : (
                        "Se connecter"
                    )}
                </button>
            </form>

            <div className={styles.formFooter}>
                <p>
                    Pas encore de compte ?{" "}
                    <Link href="/signup" className={styles.footerLink}>
                        Créer un compte
                    </Link>
                </p>
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
                <div className={styles.formCard}>
                    <header className={styles.cardHeader}>
                        <div>
                            <h2>Connexion</h2>
                            <p className={styles.cardSubhead}> </p>
                        </div>
                    </header>
                    {formContent}
                </div>
            </div>
        </div>
    );
}


