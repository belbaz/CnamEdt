"use client";

import Link from "next/link";
import styles from "./signup.module.css";

export default function SignupInterface() {
    const handleSubmit = (event) => {
        event.preventDefault();
    };

    return (
        <div className={styles.page}>
            <div className={styles.wrapper}>
                <div className={styles.notice}>
                    <h1>Accès réservé aux comptes Cnam</h1>
                    <p>
                        Identifiez-vous pour ajouter des cours dans l&apos;agenda partagé.
                    </p>
                </div>

                <div className={`${styles.formCard} ${styles.accentCard}`}>
                    <header className={styles.cardHeader}>
                        <div>
                            <h2>Créer un compte</h2>
                            <p className={styles.cardSubhead}>Déployez votre accès en 2 minutes</p>
                        </div>
                    </header>

                    <form className={styles.form} onSubmit={handleSubmit} noValidate>
                        <div className={styles.inputGroup}>
                            <label htmlFor="signup-name">Pseudo</label>
                            <input
                                id="signup-name"
                                name="username"
                                placeholder="Votre pseudo"
                                autoComplete="username"
                                required
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="signup-email">Adresse @lecnam.net</label>
                            <input
                                id="signup-email"
                                name="signupEmail"
                                type="email"
                                placeholder="prenom.nom@lecnam.net"
                                autoComplete="email"
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
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label htmlFor="signup-confirm">Confirmation</label>
                                <input
                                    id="signup-confirm"
                                    name="signupConfirm"
                                    type="password"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className={`${styles.submitButton} ${styles.accentButton}`}>
                            Créer mon compte
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
        </div>
    );
}

