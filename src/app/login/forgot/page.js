import Link from "next/link";
import styles from "../login.module.css";

export const metadata = {
    title: "Mot de passe oublié | EDT CNAM",
    description: "Réinitialisez votre accès agenda EICNAM avec votre adresse @lecnam.net.",
};

export default function ForgotPage() {
    return (
        <div className={styles.page}>
            <div className={styles.wrapper}>
                <div className={styles.notice}>
                    <h1>Mot de passe oublié</h1>
                    <p>Indiquez votre adresse @lecnam.net pour recevoir un lien de réinitialisation.</p>
                </div>

                <section className={styles.formsPanel}>
                    <div className={styles.formCard}>
                        <form className={styles.form} noValidate>
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

                        <div className={styles.backLink}>
                            <Link href="/login" className={styles.ghostLink}>
                                ← Retourner à la connexion
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

