"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import styles from "../login.module.css";

export default function ForgotPage() {
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
            setErrorMessage("Veuillez saisir votre adresse email.");
            return;
        }

        if (!normalizedEmail.endsWith("@lecnam.net")) {
            setErrorMessage("Connectez-vous uniquement avec une adresse @lecnam.net.");
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
                throw new Error(data?.error || "Erreur lors de l'envoi de l'email.");
            }

            setSuccessMessage("Si cette adresse existe, un email de réinitialisation a été envoyé. L'email peut prendre jusqu'à 3 minutes pour arriver dans votre boîte mail. Le lien sera valide 15 minutes.");
        } catch (error) {
            console.error("[ForgotPassword] Erreur:", error);
            setErrorMessage(error.message);
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.wrapper}>
                <BackButton href="/login" title="Retour à la connexion" />
                <div className={styles.notice}>
                    <h1>Mot de passe oublié</h1>
                </div>

                <section className={styles.formsPanel}>
                    <div className={styles.formCard}>
                        {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}
                        {successMessage && <div className={styles.successBanner}>{successMessage}</div>}

                        {!successMessage && (
                            <form className={styles.form} onSubmit={handleSubmit} noValidate>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="forgot-email">Adresse @lecnam.net</label>
                                    <input
                                        id="forgot-email"
                                        name="email"
                                        type="email"
                                        placeholder="prenom.nom@lecnam.net"
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
                                            Envoi...
                                        </span>
                                    ) : (
                                        "Envoyer le lien"
                                    )}
                                </button>
                            </form>
                        )}

                        {successMessage && (
                            <div style={{ marginTop: "1rem", textAlign: "center" }}>
                                <a
                                    href="https://outlook.office365.com/?realm=lecnam.net&modurl=0"
                                    className={styles.submitButton}
                                    style={{ display: "inline-block", textDecoration: "none" }}
                                >
                                    Ouvrir Outlook
                                </a>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

