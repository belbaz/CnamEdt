"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
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
        const basePages = [
            {
                title: "📅 Emploi du temps",
                description: "Consultez l'emploi du temps",
                path: "/",
                icon: "📅",
                color: "#3b82f6"
            },
            {
                title: "📋 Agenda",
                description: "Consultez l'agenda avec tous vos cours",
                path: "/agenda",
                icon: "📋",
                color: "#10b981"
            },
            {
                title: "📄 Fichiers de cours",
                description: "Gérez les fichiers uploadés par cours",
                path: "/files",
                icon: "📄",
                color: "#ec4899"
            },
            {
                title: "📜 Historique",
                description: "Historique des modifications de l'emploi du temps",
                path: "/histo",
                icon: "📜",
                color: "#8b5cf6"
            },
            {
                title: "ℹ️ Mes informations",
                description: "Consultez vos informations de compte",
                path: "/info",
                icon: "ℹ️",
                color: "#f59e0b"
            }
        ];

        const adminPages = [];
        
        if (userInfo?.role === 'superAdmin' || userInfo?.role === 'admin') {
            adminPages.push(
                {
                    title: "📊 Analytics",
                    description: "Statistiques et analyses de l'application",
                    path: "/admin/analytics",
                    icon: "📊",
                    color: "#ef4444"
                }
            );
        }

        if (userInfo?.role === 'superAdmin') {
            adminPages.push(
                {
                    title: "👥 Gestion des utilisateurs",
                    description: "Gérer les utilisateurs de l'application",
                    path: "/admin/users",
                    icon: "👥",
                    color: "#8b5cf6"
                },
                {
                    title: "🗺️ Room Mapper",
                    description: "Mapper les salles sur le plan SVG",
                    path: "/admin/room-mapper",
                    icon: "🗺️",
                    color: "#06b6d4"
                },
                {
                    title: "🔍 Monitoring",
                    description: "Suivi de l'automatisation des mises à jour",
                    path: "/monitoring",
                    icon: "🔍",
                    color: "#6366f1"
                }
            );
        }

        return [...basePages, ...adminPages];
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner}></div>
                    <p>Chargement...</p>
                </div>
            </div>
        );
    }

    if (!userInfo) {
        return null;
    }

    const availablePages = getAvailablePages();

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <BackButton href="/" title="Retour à l'EDT" />
                <header className={styles.header}>
                    <h1>Tableau de bord</h1>
                    <p className={styles.welcomeText}>
                        Bonjour <strong>{userInfo.name} {userInfo.lastName}</strong>
                        {userInfo.role && (
                            <span className={styles.roleBadge}>{userInfo.role}</span>
                        )}
                    </p>
                </header>

                <div className={styles.pagesGrid}>
                    {availablePages.map((page, index) => (
                        <div
                            key={index}
                            className={styles.pageCard}
                            onClick={() => router.push(page.path)}
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
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                        </div>
                    ))}
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
                        🚪 Se déconnecter
                    </button>
                </div>
            </div>
        </div>
    );
}

