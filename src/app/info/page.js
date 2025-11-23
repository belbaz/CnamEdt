"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./info.module.css";

export default function InfoPage() {
    const router = useRouter();
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [loggingOut, setLoggingOut] = useState(false);
    const [emailCopied, setEmailCopied] = useState(false);

    // Appliquer le dark mode au chargement
    useEffect(() => {
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
    }, []);

    useEffect(() => {
        loadUserInfo();
    }, []);

    const loadUserInfo = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/user");
            
            if (!response.ok) {
                if (response.status === 401) {
                    setError("Vous devez être connecté pour accéder à cette page.");
                    setTimeout(() => {
                        router.push("/login");
                    }, 2000);
                    return;
                }
                throw new Error("Erreur lors du chargement des informations");
            }

            const data = await response.json();
            setUserInfo(data);
        } catch (err) {
            console.error("[Info] Erreur:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        if (loggingOut) return;
        
        setLoggingOut(true);
        try {
            const response = await fetch("/api/logout", {
                method: "POST",
            });

            if (response.ok) {
                // Redirection vers l'accueil
                window.location.href = "/";
            } else {
                throw new Error("Erreur lors de la déconnexion");
            }
        } catch (err) {
            console.error("[Info] Erreur déconnexion:", err);
            alert("Erreur lors de la déconnexion : " + err.message);
            setLoggingOut(false);
        }
    };

    const handleCopyEmail = async () => {
        if (!userInfo?.email) return;

        try {
            await navigator.clipboard.writeText(userInfo.email);
            setEmailCopied(true);
            setTimeout(() => {
                setEmailCopied(false);
            }, 2000);
        } catch (err) {
            console.error("[Info] Erreur copie email:", err);
            // Fallback pour les navigateurs qui ne supportent pas clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = userInfo.email;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setEmailCopied(true);
                setTimeout(() => {
                    setEmailCopied(false);
                }, 2000);
            } catch (e) {
                alert("Impossible de copier l'email");
            }
            document.body.removeChild(textArea);
        }
    };

    const getRoleBadge = (role) => {
        const roleConfig = {
            superAdmin: { label: "Super Administrateur", className: "super-admin" },
            admin: { label: "Administrateur", className: "admin" },
            editeur: { label: "Éditeur", className: "editeur" },
            visiteur: { label: "Visiteur", className: "visiteur" }
        };
        
        return roleConfig[role] || { label: role, className: "default" };
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner}></div>
                    <p>Chargement de vos informations...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.errorContainer}>
                    <h2>⚠️ Erreur</h2>
                    <p>{error}</p>
                    <button 
                        className={styles.homeButton}
                        onClick={() => router.push("/")}
                    >
                        Retour à l'accueil
                    </button>
                </div>
            </div>
        );
    }

    if (!userInfo) {
        return null;
    }

    const roleBadge = getRoleBadge(userInfo.role);

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <header className={styles.header}>
                    <button 
                        className={styles.backButton}
                        onClick={() => router.back()}
                        title="Retour"
                    >
                        ← Retour
                    </button>
                    <h1>Informations du compte</h1>
                </header>

                <div className={styles.card}>
                    <div className={styles.avatarSection}>
                        <div className={styles.avatar}>
                            {userInfo.name?.charAt(0)}{userInfo.lastName?.charAt(0)}
                        </div>
                        <h2 className={styles.userName}>
                            {userInfo.name} {userInfo.lastName}
                        </h2>
                        <span className={`${styles.roleBadge} ${styles[roleBadge.className]}`}>
                            {roleBadge.label}
                        </span>
                    </div>

                    <div className={styles.infoSection}>
                        <div className={`${styles.infoItem} ${styles.emailItem}`}>
                            <span className={styles.infoLabel}>Email</span>
                            <div style={{ position: 'relative' }}>
                                <span className={styles.infoValue} title={userInfo.email}>{userInfo.email}</span>
                                <button
                                    className={`${styles.copyEmailButton} ${emailCopied ? styles.copied : ''}`}
                                    onClick={handleCopyEmail}
                                    title={emailCopied ? "Copié !" : "Copier l'email"}
                                >
                                    {emailCopied ? "✓" : "📋"}
                                </button>
                            </div>
                        </div>

                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Prénom</span>
                            <span className={styles.infoValue}>{userInfo.name}</span>
                        </div>

                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Nom</span>
                            <span className={styles.infoValue}>{userInfo.lastName}</span>
                        </div>

                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Rôle</span>
                            <span className={styles.infoValue}>{roleBadge.label}</span>
                        </div>

                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>ID Utilisateur</span>
                            <span className={styles.infoValue}>{userInfo.id}</span>
                        </div>

                        {userInfo.lastLogin && (
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Dernière connexion</span>
                                <span className={styles.infoValue}>
                                    {new Date(userInfo.lastLogin).toLocaleString('fr-FR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                        )}

                        {userInfo.createdAt && (
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Date de création</span>
                                <span className={styles.infoValue}>
                                    {new Date(userInfo.createdAt).toLocaleString('fr-FR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className={styles.actions}>
                        <button 
                            className={styles.agendaButton}
                            onClick={() => router.push("/agenda")}
                        >
                            📝 Mon Agenda
                        </button>
                        
                        {userInfo.role === 'superAdmin' && (
                            <button 
                                className={styles.analyticsButton}
                                onClick={() => router.push("/admin/analytics")}
                            >
                                📊 Analytics
                            </button>
                        )}

                        <button 
                            className={styles.logoutButton}
                            onClick={handleLogout}
                            disabled={loggingOut}
                        >
                            {loggingOut ? "Déconnexion..." : "🚪 Se déconnecter"}
                        </button>
                    </div>
                </div>

                <div className={styles.footer}>
                    <p>EDT CNAM EICNAM © 2025</p>
                </div>
            </div>
        </div>
    );
}

