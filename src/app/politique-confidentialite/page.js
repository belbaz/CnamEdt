"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import LoadingSpinner from "@/components/LoadingSpinner";
import {useI18n} from "@/i18n/I18nContext";
import styles from "./privacy-policy.module.css";

function PrivacyPolicyContent() {
    const { t } = useI18n();
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
                    title={backHref === '/dashboard' ? t('privacy.backToDashboard') : backHref === '/' ? t('privacy.backToEDT') : t('privacy.backToPrevious')} 
                />
                <h1 className={styles.title}>
                    {t('privacy.title')}
                </h1>
            </div>

            <p className={styles.intro}>
                {t('privacy.intro')}
            </p>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    {t('privacy.section1Title')}
                </h2>
                <div className={styles.sectionContent}>
                    <p dangerouslySetInnerHTML={{__html: t('privacy.section1Text1').replace('LocalStorage', '<strong>LocalStorage</strong>')}} />
                    <ul className={styles.list}>
                        <li dangerouslySetInnerHTML={{__html: `<strong>${t('privacy.section1Item1').split(':')[0]}</strong> : ${t('privacy.section1Item1').split(':')[1]}`}} />
                        <li dangerouslySetInnerHTML={{__html: `<strong>${t('privacy.section1Item2').split(':')[0]}</strong> : ${t('privacy.section1Item2').split(':')[1]}`}} />
                        <li dangerouslySetInnerHTML={{__html: `<strong>${t('privacy.section1Item3').split(':')[0]}</strong> : ${t('privacy.section1Item3').split(':')[1]}`}} />
                    </ul>
                    <p style={{ marginTop: "1rem" }}>
                        {t('privacy.section1Text2')}
                    </p>
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    {t('privacy.section2Title')}
                </h2>
                <div className={styles.sectionContent}>
                    <p dangerouslySetInnerHTML={{__html: t('privacy.section2Text1').replace('Supabase', '<strong>Supabase</strong>')}} />
                    <ul className={styles.list}>
                        <li>
                            {t('privacy.section2Item1')}
                        </li>
                        <li>
                            {t('privacy.section2Item2')}
                        </li>
                    </ul>
                    <p style={{ marginTop: "1rem" }}>
                        {t('privacy.section2Text2')}
                    </p>
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    {t('privacy.section3Title')}
                </h2>
                <div className={styles.sectionContent}>
                    <p>{t('privacy.section3Text1')}</p>
                    <ul className={styles.list}>
                        <li dangerouslySetInnerHTML={{__html: t('privacy.section3Item1').replace('edt_session', '<code>edt_session</code>')}} />
                        <li>
                            {t('privacy.section3Item2')}
                        </li>
                    </ul>
                    <p style={{ marginTop: "1rem" }}>
                        {t('privacy.section3Text2')}
                    </p>
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    {t('privacy.section4Title')}
                </h2>
                <div className={styles.sectionContent}>
                    <p>{t('privacy.section4Text1')}</p>
                    <ul className={styles.list}>
                        <li>
                            {t('privacy.section4Item1')}
                        </li>
                        <li>
                            {t('privacy.section4Item2')}
                        </li>
                        <li>
                            {t('privacy.section4Item3')}
                        </li>
                    </ul>
                </div>
            </section>

            <div className={styles.footer}>
                <p>
                    {t('privacy.footerText')}
                </p>
                <Link href="/contact?from=privacy-policy" className={styles.contactLink}>
                    {t('common.contact')}
                </Link>
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
