"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import Spinner from "@/components/Spinner";
import styles from "./info.module.css";

export default function InfoPage() {
    const router = useRouter();
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [loggingOut, setLoggingOut] = useState(false);
    const [emailCopied, setEmailCopied] = useState(false);
    
    // Changement de mot de passe
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState(null);
    const [passwordSuccess, setPasswordSuccess] = useState(false);

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

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError(null);
        setPasswordSuccess(false);

        // Validation
        if (!oldPassword || !newPassword || !confirmPassword) {
            setPasswordError("Tous les champs sont requis");
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError("Le nouveau mot de passe doit contenir au moins 8 caractères");
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError("Les nouveaux mots de passe ne correspondent pas");
            return;
        }

        if (oldPassword === newPassword) {
            setPasswordError("Le nouveau mot de passe doit être différent de l'ancien");
            return;
        }

        try {
            setChangingPassword(true);

            const response = await fetch("/api/user/change-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    oldPassword,
                    newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erreur lors du changement de mot de passe");
            }

            // Succès
            setPasswordSuccess(true);
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            
            // Masquer le formulaire après 2 secondes
            setTimeout(() => {
                setShowPasswordForm(false);
                setPasswordSuccess(false);
            }, 2000);

        } catch (err) {
            console.error("[Info] Erreur changement mot de passe:", err);
            setPasswordError(err.message || "Erreur lors du changement de mot de passe");
        } finally {
            setChangingPassword(false);
        }
    };

    const handleCancelPasswordChange = () => {
        setShowPasswordForm(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError(null);
        setPasswordSuccess(false);
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingContainer}>
                    <Spinner size="large" variant="border" />
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
                    <BackButton href="/dashboard" title="Retour au dashboard" />
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
                    <BackButton href="/dashboard" title="Retour au dashboard" />
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
                    </div>

                    <div className={styles.infoSection}>
                        <div className={[styles.infoItem, styles.emailItem].filter(Boolean).join(' ')}>
                            <span className={styles.infoLabel}>Email</span>
                            <div style={{ position: 'relative' }}>
                                <span className={styles.infoValue} title={userInfo.email}>{userInfo.email}</span>
                                <button
                                    className={[styles.copyEmailButton, emailCopied && styles.copied].filter(Boolean).join(' ')}
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

                    {/* Section changement de mot de passe */}
                    <div className={styles.passwordSection}>
                        <button
                            className={styles.changePasswordButton}
                            onClick={() => setShowPasswordForm(true)}
                        >
                            🔒 Changer mon mot de passe
                        </button>
                    </div>

                    <div className={styles.actions}>
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
                    <p>EDT CNAM © 2025</p>
                </div>
            </div>

            {/* Modal changement de mot de passe */}
            {showPasswordForm && (
                <div className={styles.modalOverlay} onClick={handleCancelPasswordChange}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Changer mon mot de passe</h2>
                            <button
                                className={styles.modalCloseButton}
                                onClick={handleCancelPasswordChange}
                                disabled={changingPassword}
                                aria-label="Fermer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleChangePassword} className={styles.passwordForm}>
                            {passwordError && (
                                <div className={styles.passwordError}>
                                    {passwordError}
                                </div>
                            )}
                            
                            {passwordSuccess && (
                                <div className={styles.passwordSuccess}>
                                    ✓ Mot de passe modifié avec succès !
                                </div>
                            )}

                            <div className={styles.passwordField}>
                                <label htmlFor="oldPassword">Ancien mot de passe</label>
                                <input
                                    type="password"
                                    id="oldPassword"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    placeholder="Entrez votre ancien mot de passe"
                                    required
                                    disabled={changingPassword}
                                    className={styles.passwordInput}
                                    autoFocus
                                />
                            </div>

                            <div className={styles.passwordField}>
                                <label htmlFor="newPassword">Nouveau mot de passe</label>
                                <input
                                    type="password"
                                    id="newPassword"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Au moins 8 caractères"
                                    required
                                    minLength={8}
                                    disabled={changingPassword}
                                    className={styles.passwordInput}
                                />
                            </div>

                            <div className={styles.passwordField}>
                                <label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Répétez le nouveau mot de passe"
                                    required
                                    minLength={8}
                                    disabled={changingPassword}
                                    className={styles.passwordInput}
                                />
                            </div>

                            <div className={styles.passwordFormActions}>
                                <button
                                    type="submit"
                                    disabled={changingPassword}
                                    className={styles.savePasswordButton}
                                >
                                    {changingPassword ? "Modification..." : "✓ Enregistrer"}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancelPasswordChange}
                                    disabled={changingPassword}
                                    className={styles.cancelPasswordButton}
                                >
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

