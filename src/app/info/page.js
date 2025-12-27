"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import Spinner from "@/components/Spinner";
import {useI18n} from "@/i18n/I18nContext";
import styles from "./info.module.css";

export default function InfoPage() {
    const { t } = useI18n();
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
                    setError(t('info.mustBeConnected'));
                    setTimeout(() => {
                        router.push("/login");
                    }, 2000);
                    return;
                }
                throw new Error(t('info.errorLoading'));
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
                throw new Error(t('info.errorLogout'));
            }
        } catch (err) {
            console.error("[Info] Erreur déconnexion:", err);
            alert(t('info.errorLogoutMessage') + " " + err.message);
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
                alert(t('info.errorLogout'));
            }
            document.body.removeChild(textArea);
        }
    };

    const getRoleBadge = (role) => {
        const roleConfig = {
            superAdmin: { label: t('info.roles.superAdmin'), className: "super-admin" },
            admin: { label: t('info.roles.admin'), className: "admin" },
            editeur: { label: t('info.roles.editeur'), className: "editeur" },
            visiteur: { label: t('info.roles.visiteur'), className: "visiteur" }
        };
        
        return roleConfig[role] || { label: role, className: "default" };
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError(null);
        setPasswordSuccess(false);

        // Validation
        if (!oldPassword || !newPassword || !confirmPassword) {
            setPasswordError(t('info.passwordModal.errorAllFields'));
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError(t('info.passwordModal.errorMinLength'));
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError(t('info.passwordModal.errorMatch'));
            return;
        }

        if (oldPassword === newPassword) {
            setPasswordError(t('info.passwordModal.errorDifferent'));
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
                throw new Error(data.error || t('info.passwordModal.errorChange'));
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
            setPasswordError(err.message || t('info.passwordModal.errorChange'));
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
                    <p>{t('info.loading')}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.errorContainer}>
                    <h2>{t('info.error')}</h2>
                    <p>{error}</p>
                    <BackButton href="/dashboard" title={t('info.backToDashboard')} />
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
                    <BackButton href="/dashboard" title={t('info.backToDashboard')} />
                    <h1>{t('info.title')}</h1>
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
                            <span className={styles.infoLabel}>{t('info.email')}</span>
                            <div style={{ position: 'relative' }}>
                                <span className={styles.infoValue} title={userInfo.email}>{userInfo.email}</span>
                                <button
                                    className={[styles.copyEmailButton, emailCopied && styles.copied].filter(Boolean).join(' ')}
                                    onClick={handleCopyEmail}
                                    title={emailCopied ? t('info.copied') : t('info.copyEmail')}
                                >
                                    {emailCopied ? "✓" : "📋"}
                                </button>
                            </div>
                        </div>

                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>{t('info.firstName')}</span>
                            <span className={styles.infoValue}>{userInfo.name}</span>
                        </div>

                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>{t('info.lastName')}</span>
                            <span className={styles.infoValue}>{userInfo.lastName}</span>
                        </div>

                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>{t('info.role')}</span>
                            <span className={styles.infoValue}>{roleBadge.label}</span>
                        </div>

                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>{t('info.userId')}</span>
                            <span className={styles.infoValue}>{userInfo.id}</span>
                        </div>

                        {userInfo.lastLogin && (
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>{t('info.lastLogin')}</span>
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
                                <span className={styles.infoLabel}>{t('info.createdAt')}</span>
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
                            {t('info.changePassword')}
                        </button>
                    </div>

                    <div className={styles.actions}>
                        <button 
                            className={styles.logoutButton}
                            onClick={handleLogout}
                            disabled={loggingOut}
                        >
                            {loggingOut ? t('info.loggingOut') : t('info.logout')}
                        </button>
                    </div>
                </div>

                <div className={styles.footer}>
                    <p>{t('info.copyright')}</p>
                </div>
            </div>

            {/* Modal changement de mot de passe */}
            {showPasswordForm && (
                <div className={styles.modalOverlay} onClick={handleCancelPasswordChange}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>{t('info.passwordModal.title')}</h2>
                            <button
                                className={styles.modalCloseButton}
                                onClick={handleCancelPasswordChange}
                                disabled={changingPassword}
                                aria-label={t('info.passwordModal.close')}
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
                                    {t('info.passwordModal.success')}
                                </div>
                            )}

                            <div className={styles.passwordField}>
                                <label htmlFor="oldPassword">{t('info.passwordModal.oldPassword')}</label>
                                <input
                                    type="password"
                                    id="oldPassword"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    placeholder={t('info.passwordModal.oldPasswordPlaceholder')}
                                    required
                                    disabled={changingPassword}
                                    className={styles.passwordInput}
                                    autoFocus
                                />
                            </div>

                            <div className={styles.passwordField}>
                                <label htmlFor="newPassword">{t('info.passwordModal.newPassword')}</label>
                                <input
                                    type="password"
                                    id="newPassword"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder={t('info.passwordModal.newPasswordPlaceholder')}
                                    required
                                    minLength={8}
                                    disabled={changingPassword}
                                    className={styles.passwordInput}
                                />
                            </div>

                            <div className={styles.passwordField}>
                                <label htmlFor="confirmPassword">{t('info.passwordModal.confirmPassword')}</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder={t('info.passwordModal.confirmPasswordPlaceholder')}
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
                                    {changingPassword ? t('info.passwordModal.saving') : t('info.passwordModal.save')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancelPasswordChange}
                                    disabled={changingPassword}
                                    className={styles.cancelPasswordButton}
                                >
                                    {t('info.passwordModal.cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

