"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import Spinner from "@/components/Spinner";
import { useI18n } from "@/i18n/I18nContext";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
    const { t } = useI18n();
    const router = useRouter();
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Appliquer le dark mode au chargement
        try {
            const cookieMatch = document.cookie.match(/(?:^|; )darkMode=([^;]+)/);
            const fromCookie = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
            const fromStorage = localStorage.getItem('darkMode');
            const dark = fromCookie != null ? (fromCookie === 'true') : (fromStorage === 'true');
            if (dark) {
                document.documentElement.classList.add('dark-mode');
            } else {
                document.documentElement.classList.remove('dark-mode');
            }

            // Vérifier aussi le mode OLED
            const oledMode = localStorage.getItem('oledMode') === 'true';
            if (oledMode && dark) {
                document.documentElement.classList.add('oled-mode');
            } else {
                document.documentElement.classList.remove('oled-mode');
            }
        } catch (e) {
            // Erreur silencieuse
        }

        loadUserInfo();
    }, []);

    const loadUserInfo = async () => {
        try {
            const response = await fetch("/api/user", { cache: "no-store" });
            if (response.ok) {
                const data = await response.json();
                setUserInfo(data);
            } else {
                // Non connecté, rediriger vers login
                router.push("/login");
                return;
            }
        } catch (error) {
            console.error("[Dashboard] Erreur chargement utilisateur:", error);
            router.push("/login");
            return;
        } finally {
            setLoading(false);
        }
    };

    // Pages disponibles selon le rôle
    const getAvailablePages = () => {
        const basePages = [{
            title: t('dashboard.pages.schedule.title'),
            description: t('dashboard.pages.schedule.description'),
            path: "/",
            icon: "📅",
            color: "#3b82f6"
        }, {
            title: t('dashboard.pages.agenda.title'),
            description: t('dashboard.pages.agenda.description'),
            path: "/agenda",
            icon: "📋",
            color: "#10b981"
        }, {
            title: t('dashboard.pages.notes.title'),
            description: t('dashboard.pages.notes.description'),
            path: "/galao",
            icon: "🎓",
            color: "#f59e0b"
        }, {
            title: t('dashboard.pages.files.title'),
            description: t('dashboard.pages.files.description'),
            path: "/files",
            icon: "📄",
            color: "#ec4899"
        }, {
            title: t('dashboard.pages.exams.title'),
            description: t('dashboard.pages.exams.description'),
            path: "/examens",
            icon: "📝",
            color: "#ef4444"
        }, {
            title: t('dashboard.pages.history.title'),
            description: t('dashboard.pages.history.description'),
            path: "/histo",
            icon: "📜",
            color: "#8b5cf6"
        }, {
            title: t('dashboard.pages.compte.title'),
            description: t('dashboard.pages.compte.description'),
            path: "/compte",
            icon: "👤",
            color: "#f59e0b"
        }];

        const adminPages = [];

        if (userInfo?.role !== 'superAdmin') {
            adminPages.push({
                title: t('dashboard.pages.privacy.title'),
                description: t('dashboard.pages.privacy.description'),
                path: "/politique-confidentialite",
                icon: "🔒",
                color: "#6366f1"
            });
        }

        if (userInfo?.role === 'superAdmin') {
            adminPages.push({
                title: t('dashboard.pages.analytics.title'),
                description: t('dashboard.pages.analytics.description'),
                path: "/admin/analytics",
                icon: "📊",
                color: "#ef4444"
            }, {
                title: t('dashboard.pages.users.title'),
                description: t('dashboard.pages.users.description'),
                path: "/admin/users",
                icon: "👥",
                color: "#8b5cf6"
            }, {
                title: t('dashboard.pages.roomMapper.title'),
                description: t('dashboard.pages.roomMapper.description'),
                path: "/admin/room-mapper",
                icon: "🗺️",
                color: "#06b6d4"
            });
        }

        return [...basePages, ...adminPages];
    };

    if (loading) {
        return (<div className={styles.container}>
            <div className={styles.loadingContainer}>
                <Spinner size="large" variant="border" />
                <p suppressHydrationWarning>{t('dashboard.loading')}</p>
            </div>
        </div>);
    }

    if (!userInfo) {
        return null;
    }

    const availablePages = getAvailablePages();

    return (<div className={styles.container}>
        <div className={styles.content}>
            <header className={styles.parentHeader}>
                <BackButton href="/" title={t('dashboard.backToEDT')} />
                <div className={styles.header}>
                    <h1>{t('dashboard.title')}</h1>
                    <p className={styles.welcomeText}>
                        {t('dashboard.welcome')}<strong>{userInfo.name} {userInfo.lastName}</strong>
                        {userInfo.role && (<span className={styles.roleBadge}>{userInfo.role}</span>)}
                    </p>
                </div>
            </header>

            <div className={`${styles.pagesGrid} ${userInfo?.role !== 'superAdmin' ? styles.balancedGrid : ''}`}>
                {availablePages.map((page, index) => {
                    // Si on clique sur l'historique ou la politique de confidentialité depuis le dashboard,
                    // on ajoute un paramètre pour que la page sache revenir ici
                    const targetPath = (page.path === "/histo" || page.path === "/politique-confidentialite") ? `${page.path}?from=dashboard` : page.path;

                    return (<div
                        key={index}
                        className={styles.pageCard}
                        onClick={() => router.push(targetPath)}
                        style={{ '--card-color': page.color }}
                    >
                        <div className={styles.cardIcon} style={{ backgroundColor: `${page.color}15` }}>
                            <span style={{ fontSize: '2rem' }}>{page.icon}</span>
                        </div>
                        <div className={styles.cardContent}>
                            <h3 className={styles.cardTitle}>{page.title}</h3>
                            <p className={styles.cardDescription}>{page.description}</p>
                        </div>
                        <div className={styles.cardArrow}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>);
                })}
            </div>

            <div className={styles.footer}>
                <button
                    className={styles.logoutButton}
                    onClick={async () => {
                        try {
                            await fetch("/api/logout", { method: "POST" });
                            window.location.href = "/";
                        } catch (error) {
                            console.error("[Dashboard] Erreur déconnexion:", error);
                        }
                    }}
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={styles.logoutIcon}
                    >
                        <path
                            d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <span>{t('dashboard.logout')}</span>
                </button>
            </div>
        </div>
    </div>);
}

