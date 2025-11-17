"use client";

import Link from "next/link";
import styles from "../login.module.css";

export default function ForgotInterface() {
    const handleSubmit = (event) => {
        event.preventDefault();
    };

    return (
        <div className={styles.page}>
            <div className={styles.wrapper}>
                <div className={styles.notice}>
                    <h1>Mot de passe oublié</h1>
                    <p>
                        Indiquez votre adresse @lecnam.net pour recevoir un lien de réinitialisation.
                    </p>
                </div>

                <section className={styles.formsPanel}>
                    <div className={styles.formCard}>
                        <header className={styles.cardHeader}>
                            <div>
                                <p>Agenda EICNAM</p>
                                <h2>Recevoir un lien</h2>
                            </div>
                        </header>

                        <form className={styles.form} onSubmit={handleSubmit} noValidate>
                            <div className={styles.inputGroup}>
                                <label htmlFor="forgot-email">Adresse @lecnam.net</label>
                                <input
                                    id="forgot-email"
                                    name="email"
                                    type="email"
                                    placeholder="prenom.nom@lecnam.net"
                                    autoComplete="email"
                                    required
                                />
                            </div>

                            <button type="submit" className={styles.submitButton}>
                                Envoyer le lien
                            </button>
                        </form>
                    </div>

                    <div className={styles.formCard}>
                        <header className={styles.cardHeader}>
                            <div>
                                <p>Besoin d&apos;aide ?</p>
                                <h2>Raccourcis utiles</h2>
                            </div>
                        </header>
                        <div className={styles.linksList}>
                            <Link href="/login" className={styles.quickLink}>
                                ← Retourner à la connexion
                            </Link>
                            <Link href="/" className={styles.quickLink}>
                                Ouvrir mon emploi du temps
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

