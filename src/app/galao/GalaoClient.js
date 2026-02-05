"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import styles from "../login/login.module.css";

/**
 * Page centrale Galao :
 * - gère la connexion (login Galao)
 * - propose ensuite le choix Notes / Absences
 */
export default function GalaoClient() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [errorMessage, setErrorMessage] = useState("");
    const [infoMessage, setInfoMessage] = useState("");
    const [hasExistingSession, setHasExistingSession] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Détection d'une session existante (cookie galao_client posé par /api/galao/login)
    useEffect(() => {
        if (typeof document === "undefined") return;
        const hasClientFlag = document.cookie.split(";").some((c) =>
            c.trim().startsWith("galao_client="),
        );
        if (hasClientFlag) {
            setHasExistingSession(true);
            setIsLoggedIn(true);
            setInfoMessage("Connexion Galao déjà active.");
        }
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrorMessage("");
        setInfoMessage("");

        if (!username.trim() || !password.trim()) {
            setErrorMessage("Merci de renseigner vos identifiants Galao.");
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await fetch("/api/galao/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const payload = await response.json();

            if (!response.ok || !payload?.success) {
                throw new Error(payload?.error || "Impossible de se connecter à Galao.");
            }

            setIsLoggedIn(true);
            setHasExistingSession(true);
            setInfoMessage("Connexion à Galao réussie. Choisissez une rubrique ci-dessous.");
        } catch (err) {
            setErrorMessage(err.message || "Erreur inattendue lors de la connexion à Galao.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoNotes = () => {
        router.push("/note");
    };

    const handleGoAbsences = () => {
        router.push("/absences");
    };

    return (
        <div className={styles.page}>
            <div className={styles.notePage}>
                <BackButton href="/" title="Retour à l'emploi du temps" />

                <div className={styles.formCard}>
                    <header className={styles.cardHeader}>
                        <div>
                            <h2>Portail Galao</h2>
                            <p className={styles.cardSubhead}>
                                Connecte-toi à Galao puis choisis de consulter tes{" "}
                                <strong>notes</strong> ou tes <strong>absences</strong>.
                            </p>
                        </div>
                    </header>

                    {!isLoggedIn && (
                        <>
                            {errorMessage && (
                                <div className={styles.errorBanner}>{errorMessage}</div>
                            )}
                            {infoMessage && (
                                <div className={styles.successBanner}>{infoMessage}</div>
                            )}

                            <form className={styles.form} onSubmit={handleSubmit}>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="galao-username">Identifiant Galao</label>
                                    <input
                                        id="galao-username"
                                        type="text"
                                        autoComplete="username"
                                        placeholder="Identifiant Galao"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div className={styles.inputGroup}>
                                    <label htmlFor="galao-password">Mot de passe Galao</label>
                                    <input
                                        id="galao-password"
                                        type="password"
                                        autoComplete="current-password"
                                        placeholder="Mot de passe Galao"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className={styles.submitButton}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Connexion en cours..." : "Se connecter à Galao"}
                                </button>
                            </form>

                            <div className={styles.formFooter}>
                                <p>
                                    Tes identifiants ne sont pas stockés, ils sont uniquement utilisés
                                    pour ouvrir une session Galao.
                                </p>
                            </div>
                        </>
                    )}

                    {isLoggedIn && (
                        <div style={{ marginTop: "1.5rem" }}>
                            {infoMessage && (
                                <div
                                    className={styles.successBanner}
                                    style={{ marginBottom: "0.75rem" }}
                                >
                                    {infoMessage}
                                </div>
                            )}
                            <p
                                style={{
                                    fontSize: "0.9rem",
                                    color: "var(--text-secondary)",
                                    marginBottom: "0.75rem",
                                }}
                            >
                                Choisis maintenant ce que tu veux consulter :
                            </p>
                            <div className={styles.galaoChoiceGrid}>
                                <button
                                    type="button"
                                    className={styles.galaoChoiceButton}
                                    onClick={handleGoNotes}
                                >
                                    <span className={styles.galaoChoiceIcon}>📊</span>
                                    <span className={styles.galaoChoiceLabel}>
                                        Voir mes notes
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.galaoChoiceButton} ${styles.galaoChoiceButtonAccent}`}
                                    onClick={handleGoAbsences}
                                >
                                    <span className={styles.galaoChoiceIcon}>🕒</span>
                                    <span className={styles.galaoChoiceLabel}>
                                        Voir mes absences
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

