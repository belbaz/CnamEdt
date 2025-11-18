import Link from "next/link";
import styles from "./login.module.css";

export const metadata = {
    title: "Connexion | EDT CNAM",
    description: "Accédez à votre espace utilisateur pour gérer votre emploi du temps EICNAM.",
};

export default function LoginPage() {
    return (
        <div className={styles.page}>
            <div className={styles.wrapper}>
                <div className={styles.formCard}>
                    <header className={styles.cardHeader}>
                        <div>
                            <h2>Connexion</h2>
                            <p className={styles.cardSubhead}>Espace agenda instantané</p>
                        </div>
                    </header>

                    <form className={styles.form} noValidate>
                        <div className={styles.inputGroup}>
                            <label htmlFor="login-email">Adresse e-mail</label>
                            <input
                                id="login-email"
                                name="email"
                                type="email"
                                placeholder="prenom.nom@lecnam.net"
                                autoComplete="email"
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
                                required
                            />
                        </div>

                        <div className={styles.inlineActions}>
                            <Link href="/login/forgot" className={styles.ghostLink}>
                                Mot de passe oublié ?
                            </Link>
                        </div>

                        <button type="submit" className={styles.submitButton}>
                            Se connecter
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
                </div>
            </div>
        </div>
    );
}

