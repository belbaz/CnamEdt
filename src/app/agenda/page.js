import Link from "next/link";
import { cookies } from "next/headers";
import styles from "./page.module.css";
import { verifySessionToken } from "@/lib/sessionToken";

export const metadata = {
    title: "Mon agenda | EDT CNAM",
    description: "Consultez l'état de votre session et vos informations de connexion.",
};

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
    const cookieStore = await cookies();
    const session = cookieStore.get("edt_session")?.value;

    const user = session ? verifySessionToken(session) : null;

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.status}>
                    <span className={`${styles.badge} ${user ? styles.badgeConnected : styles.badgeGuest}`}>
                        {user ? "Connecté" : "Invité"}
                    </span>
                    <h1>{user ? `Bonjour ${user.name} ${user.lastName}` : "Vous n'êtes pas connecté"}</h1>
                    <p>
                        {user
                            ? "Votre session est active. Accédez à toutes les fonctionnalités réservées."
                            : "Connectez-vous avec votre adresse @lecnam.net pour accéder à l'agenda complet."}
                    </p>
                </div>

                <div className={styles.infoBox}>
                    {user ? (
                        <>
                            <p>
                                <strong>Adresse :</strong> {user.email}
                            </p>
                            <p>
                                <strong>Rôle :</strong> {user.role}
                            </p>
                        </>
                    ) : (
                        <p>Aucune session valide n&apos;a été détectée sur ce navigateur.</p>
                    )}
                </div>

                <div className={styles.actions}>
                    {user ? (
                        <Link href="/" className={styles.primaryButton}>
                            Ouvrir mon agenda
                        </Link>
                    ) : (
                        <>
                            <Link href="/login" className={styles.primaryButton}>
                                Se connecter
                            </Link>
                            <Link href="/signup" className={styles.ghostLink}>
                                Créer un compte
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}


