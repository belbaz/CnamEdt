"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BackButton from "@/components/BackButton";
import LoadingSpinner from "@/components/LoadingSpinner";
import styles from "./privacy-policy.module.css";

function PrivacyPolicyContent() {
    const searchParams = useSearchParams();
    const [backHref, setBackHref] = useState(null);

    useEffect(() => {
        // Vérifier si on vient du dashboard via le paramètre URL
        const from = searchParams?.get('from');
        
        if (from === 'dashboard') {
            // Si on vient du dashboard, retour vers /dashboard
            setBackHref('/dashboard');
        } else {
            // Sinon, vérifier le referrer
            if (typeof window !== 'undefined' && document.referrer) {
                try {
                    const referrerUrl = new URL(document.referrer);
                    const referrerPath = referrerUrl.pathname;
                    
                    // Si le referrer est la page d'accueil, retour vers /
                    if (referrerPath === '/') {
                        setBackHref('/');
                    } else {
                        // Sinon, laisser le BackButton utiliser router.back()
                        setBackHref(null);
                    }
                } catch (e) {
                    // En cas d'erreur de parsing, laisser le comportement par défaut
                    setBackHref(null);
                }
            } else {
                // Pas de referrer, laisser le comportement par défaut
                setBackHref(null);
            }
        }
    }, [searchParams]);

    return (
        <main className={styles.container}>
            <div className={styles.header}>
                <BackButton 
                    href={backHref} 
                    title={backHref === '/dashboard' ? "Retour au dashboard" : backHref === '/' ? "Retour à l'EDT" : "Retour à la page précédente"} 
                />
                <h1 className={styles.title}>
                    Politique de confidentialité
                </h1>
            </div>

            <p className={styles.intro}>
                La confidentialité de vos données est une priorité. Cette page détaille en toute transparence les informations que nous utilisons pour faire fonctionner l&apos;application.
            </p>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    1. Fonctionnement local et Stockage
                </h2>
                <div className={styles.sectionContent}>
                    <p>
                        L&apos;application est conçue pour fonctionner au maximum en local sur votre appareil via le <strong>LocalStorage</strong>.
                        Nous y enregistrons :
                    </p>
                    <ul className={styles.list}>
                        <li>
                            <strong>Vos préférences d&apos;affichage</strong> : Thème (Sombre/Clair), filtres, options de vue.
                        </li>
                        <li>
                            <strong>Le cache de votre emploi du temps</strong> : Pour permettre un accès hors-ligne et rapide.
                        </li>
                        <li>
                            <strong>L&apos;état de l&apos;application</strong> : Jours réduits, défilement automatique, etc.
                        </li>
                    </ul>
                    <p style={{ marginTop: "1rem" }}>
                        Ces données restent sur votre appareil et ne sont pas envoyées à des tiers.
                    </p>
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    2. Authentification et Base de données
                </h2>
                <div className={styles.sectionContent}>
                    <p>
                        Pour la synchronisation et l&apos;accès sécurisé, nous utilisons <strong>Supabase</strong> (hébergé sur AWS).
                        Si vous créez un compte, nous stockons de manière sécurisée :
                    </p>
                    <ul className={styles.list}>
                        <li>
                            Vos identifiants de connexion (mots de passe chiffrés).
                        </li>
                        <li>
                            Vos paramètres de synchronisation.
                        </li>
                    </ul>
                    <p style={{ marginTop: "1rem" }}>
                        L&apos;accès à ces données est strictement limité au fonctionnement du service.
                    </p>
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    3. Cookies
                </h2>
                <div className={styles.sectionContent}>
                    <p>Nous utilisons un nombre minimal de cookies, uniquement pour :</p>
                    <ul className={styles.list}>
                        <li>
                            Maintenir votre session connectée (<code>edt_session</code>).
                        </li>
                        <li>
                            Mémoriser votre choix de consentement.
                        </li>
                    </ul>
                    <p style={{ marginTop: "1rem" }}>
                        Aucun cookie publicitaire ou de traçage tiers n&apos;est utilisé.
                    </p>
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    4. Vos Droits
                </h2>
                <div className={styles.sectionContent}>
                    <p>Vous gardez le contrôle total. Vous pouvez à tout moment :</p>
                    <ul className={styles.list}>
                        <li>
                            Vider le cache de l&apos;application (via les paramètres).
                        </li>
                        <li>
                            Supprimer votre compte et vos données associées.
                        </li>
                        <li>
                            Demander l&apos;accès ou la rectification de vos informations en nous contactant.
                        </li>
                    </ul>
                </div>
            </section>

            <div className={styles.footer}>
                <p>
                    Pour toute question :
                </p>
                <a href="https://belbaz.vercel.app/contact" className={styles.contactLink}>
                    contact
                </a>
            </div>
        </main>
    );
}

export default function PrivacyPolicyPage() {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <PrivacyPolicyContent />
        </Suspense>
    );
}
