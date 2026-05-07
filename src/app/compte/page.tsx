// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import HoverTooltip from "@/components/HoverTooltip";
import Spinner from "@/components/Spinner";
import {useI18n} from "@/i18n/I18nContext";
import { applyThemeFromBrowserStorage } from "@/lib/themeHydration";
import styles from "./compte.module.css";

export default function ComptePage() {
    const { t, language, setLanguage } = useI18n();
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
    
    // Demande de suppression de compte
    const [showDeletionModal, setShowDeletionModal] = useState(false);
    const [requestingDeletion, setRequestingDeletion] = useState(false);
    const [deletionSuccess, setDeletionSuccess] = useState(false);
    const [deletionError, setDeletionError] = useState(null);
    
    // Sélecteur de langue
    const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

    // Thème (OLED prioritaire via cookie de session)
    useEffect(() => {
        try {
            applyThemeFromBrowserStorage();
        } catch (e) {
            // Erreur silencieuse
        }
    }, []);

    useEffect(() => {
        loadUserInfo();
    }, []);

    // Fermer le menu de langue en cliquant à l'extérieur
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showLanguageDropdown && !event.target.closest(`.${styles.languageSelector}`)) {
                setShowLanguageDropdown(false);
            }
        };

        if (showLanguageDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [showLanguageDropdown]);

    const loadUserInfo = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/user");
            
            if (!response.ok) {
                if (response.status === 401) {
                    setError(t('compte.mustBeConnected'));
                    setTimeout(() => {
                        router.push("/login");
                    }, 2000);
                    return;
                }
                throw new Error(t('compte.errorLoading'));
            }

            const data = await response.json();
            setUserInfo(data);
        } catch (err) {
            console.error("[Compte] Erreur:", err);
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
                throw new Error(t('compte.errorLogout'));
            }
        } catch (err) {
            console.error("[Compte] Erreur déconnexion:", err);
            alert(t('compte.errorLogoutMessage') + " " + err.message);
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
            console.error("[Compte] Erreur copie email:", err);
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
                alert(t('compte.errorLogout'));
            }
            document.body.removeChild(textArea);
        }
    };

    const getRoleBadge = (role) => {
        const roleConfig = {
            superAdmin: { label: t('compte.roles.superAdmin'), className: "super-admin" },
            admin: { label: t('compte.roles.admin'), className: "admin" },
            editeur: { label: t('compte.roles.editeur'), className: "editeur" },
            visiteur: { label: t('compte.roles.visiteur'), className: "visiteur" }
        };
        
        return roleConfig[role] || { label: role, className: "default" };
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError(null);
        setPasswordSuccess(false);

        // Validation
        if (!oldPassword || !newPassword || !confirmPassword) {
            setPasswordError(t('compte.passwordModal.errorAllFields'));
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError(t('compte.passwordModal.errorMinLength'));
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError(t('compte.passwordModal.errorMatch'));
            return;
        }

        if (oldPassword === newPassword) {
            setPasswordError(t('compte.passwordModal.errorDifferent'));
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
                throw new Error(data.error || t('compte.passwordModal.errorChange'));
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
            console.error("[Compte] Erreur changement mot de passe:", err);
            setPasswordError(err.message || t('compte.passwordModal.errorChange'));
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

    const handleOpenDeletionModal = () => {
        setShowDeletionModal(true);
        setDeletionError(null);
        setDeletionSuccess(false);
    };

    const handleCloseDeletionModal = () => {
        if (requestingDeletion) return;
        setShowDeletionModal(false);
        setDeletionError(null);
    };

    const handleRequestAccountDeletion = async () => {
        if (requestingDeletion) return;

        setRequestingDeletion(true);
        setDeletionError(null);
        setDeletionSuccess(false);

        try {
            const response = await fetch("/api/request-account-deletion", {
                method: "POST",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || t('compte.deletionRequestError'));
            }

            setDeletionSuccess(true);
            
            // Fermer la modale après 2 secondes
            setTimeout(() => {
                setShowDeletionModal(false);
                setDeletionSuccess(false);
            }, 2000);

        } catch (err) {
            console.error("[Compte] Erreur demande suppression:", err);
            setDeletionError(err.message || t('compte.deletionRequestError'));
        } finally {
            setRequestingDeletion(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingContainer}>
                    <Spinner size="large" variant="border" />
                    <p>{t('compte.loading')}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.errorContainer}>
                    <h2>{t('compte.error')}</h2>
                    <p>{error}</p>
                    <BackButton href="/dashboard" title={t('compte.backToDashboard')} />
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
                    <BackButton href="/dashboard" title={t('compte.backToDashboard')} />
                    <h1>{t('compte.title')}</h1>
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
                            <span className={styles.infoLabel}>{t('compte.email')}</span>
                            <div style={{ position: 'relative' }}>
                                <HoverTooltip text={userInfo.email}>
                                <span className={styles.infoValue}>{userInfo.email}</span>
                                </HoverTooltip>
                                <HoverTooltip text={emailCopied ? t('compte.copied') : t('compte.copyEmail')}>
                                <button
                                    className={[styles.copyEmailButton, emailCopied && styles.copied].filter(Boolean).join(' ')}
                                    onClick={handleCopyEmail}
                                >
                                    {emailCopied ? "✓" : "📋"}
                                </button>
                                </HoverTooltip>
                            </div>
                        </div>

                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>{t('compte.firstName')}</span>
                            <span className={styles.infoValue}>{userInfo.name}</span>
                        </div>

                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>{t('compte.lastName')}</span>
                            <span className={styles.infoValue}>{userInfo.lastName}</span>
                        </div>

                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>{t('compte.role')}</span>
                            <span className={styles.infoValue}>{roleBadge.label}</span>
                        </div>

                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>{t('compte.userId')}</span>
                            <span className={styles.infoValue}>{userInfo.id}</span>
                        </div>

                        {userInfo.lastLogin && (
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>{t('compte.lastLogin')}</span>
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
                                <span className={styles.infoLabel}>{t('compte.createdAt')}</span>
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

                    {/* Section changement de langue */}
                    <div className={styles.languageSection}>
                        <div className={styles.languageItem}>
                            <span className={styles.infoLabel}>{t('compte.language')}</span>
                            <div className={styles.languageSelector}>
                                <HoverTooltip text={language === 'fr' ? t('compte.languageFrench') : t('compte.languageEnglish')}>
                                <button
                                    type="button"
                                    className={styles.languageButton}
                                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                                    aria-expanded={showLanguageDropdown}
                                    aria-haspopup="true"
                                >
                                    <span className={styles.languageButtonText}>
                                        {language === 'fr' ? t('compte.languageFrench') : t('compte.languageEnglish')}
                                    </span>
                                    <span className={styles.languageButtonIcon}>
                                        {showLanguageDropdown ? '▲' : '▼'}
                                    </span>
                                </button>
                                </HoverTooltip>
                                {showLanguageDropdown && (
                                    <>
                                        <div 
                                            className={styles.languageDropdownOverlay}
                                            onClick={() => setShowLanguageDropdown(false)}
                                        />
                                        <div className={styles.languageDropdown}>
                                            <button
                                                type="button"
                                                className={`${styles.languageOption} ${language === 'fr' ? styles.languageOptionActive : ''}`}
                                                onClick={() => {
                                                    setLanguage('fr');
                                                    setShowLanguageDropdown(false);
                                                }}
                                            >
                                                <span className={styles.languageOptionFlag}>
                                                    <svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <rect width="8" height="18" fill="#1E40AF"/>
                                                        <rect x="8" width="8" height="18" fill="#FFFFFF"/>
                                                        <rect x="16" width="8" height="18" fill="#DC2626"/>
                                                    </svg>
                                                </span>
                                                <span className={styles.languageOptionText}>{t('compte.languageFrench')}</span>
                                                {language === 'fr' && <span className={styles.languageOptionCheck}>✓</span>}
                                            </button>
                                            <button
                                                type="button"
                                                className={`${styles.languageOption} ${language === 'en' ? styles.languageOptionActive : ''}`}
                                                onClick={() => {
                                                    setLanguage('en');
                                                    setShowLanguageDropdown(false);
                                                }}
                                            >
                                                <span className={styles.languageOptionFlag}>
                                                    <svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <rect width="24" height="18" fill="#1E3A8A"/>
                                                        <path d="M0 0L24 18M24 0L0 18" stroke="white" strokeWidth="2.4"/>
                                                        <path d="M0 0L24 18M24 0L0 18" stroke="#DC2626" strokeWidth="1.6"/>
                                                        <path d="M12 0V18M0 9H24" stroke="white" strokeWidth="3.2"/>
                                                        <path d="M12 0V18M0 9H24" stroke="#DC2626" strokeWidth="2"/>
                                                    </svg>
                                                </span>
                                                <span className={styles.languageOptionText}>{t('compte.languageEnglish')}</span>
                                                {language === 'en' && <span className={styles.languageOptionCheck}>✓</span>}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section changement de mot de passe */}
                    <div className={styles.passwordSection}>
                        <button
                            className={styles.changePasswordButton}
                            onClick={() => setShowPasswordForm(true)}
                        >
                            {t('compte.changePassword')}
                        </button>
                    </div>

                    <div className={styles.actions}>
                        <button 
                            className={styles.logoutButton}
                            onClick={handleLogout}
                            disabled={loggingOut}
                        >
                            {loggingOut ? t('compte.loggingOut') : t('compte.logout')}
                        </button>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className={styles.dangerZone}>
                    <div className={styles.dangerZoneHeader}>
                        <h2 className={styles.dangerZoneTitle}>{t('compte.dangerZone.title')}</h2>
                        <p className={styles.dangerZoneDescription}>{t('compte.dangerZone.description')}</p>
                    </div>
                    <div className={styles.dangerZoneContent}>
                        {deletionSuccess && (
                            <div className={styles.passwordSuccess} style={{ marginBottom: '1rem' }}>
                                {t('compte.deletionRequestSuccess')}
                            </div>
                        )}
                        {deletionError && (
                            <div className={styles.passwordError} style={{ marginBottom: '1rem' }}>
                                {deletionError}
                            </div>
                        )}
                        <button
                            className={styles.deleteAccountButton}
                            onClick={handleOpenDeletionModal}
                            disabled={requestingDeletion}
                        >
                            {t('compte.requestAccountDeletion')}
                        </button>
                    </div>
                </div>

                <div className={styles.footer}>
                    <p>{t('compte.copyright')}</p>
                </div>
            </div>

            {/* Modal changement de mot de passe */}
            {showPasswordForm && (
                <div className={styles.modalOverlay} onClick={handleCancelPasswordChange}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>{t('compte.passwordModal.title')}</h2>
                            <button
                                className={styles.modalCloseButton}
                                onClick={handleCancelPasswordChange}
                                disabled={changingPassword}
                                aria-label={t('compte.passwordModal.close')}
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
                                    {t('compte.passwordModal.success')}
                                </div>
                            )}

                            <div className={styles.passwordField}>
                                <label htmlFor="oldPassword">{t('compte.passwordModal.oldPassword')}</label>
                                <input
                                    type="password"
                                    id="oldPassword"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    placeholder={t('compte.passwordModal.oldPasswordPlaceholder')}
                                    required
                                    disabled={changingPassword}
                                    className={styles.passwordInput}
                                    autoFocus
                                />
                            </div>

                            <div className={styles.passwordField}>
                                <label htmlFor="newPassword">{t('compte.passwordModal.newPassword')}</label>
                                <input
                                    type="password"
                                    id="newPassword"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder={t('compte.passwordModal.newPasswordPlaceholder')}
                                    required
                                    minLength={8}
                                    disabled={changingPassword}
                                    className={styles.passwordInput}
                                />
                            </div>

                            <div className={styles.passwordField}>
                                <label htmlFor="confirmPassword">{t('compte.passwordModal.confirmPassword')}</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder={t('compte.passwordModal.confirmPasswordPlaceholder')}
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
                                    {changingPassword ? t('compte.passwordModal.saving') : t('compte.passwordModal.save')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancelPasswordChange}
                                    disabled={changingPassword}
                                    className={styles.cancelPasswordButton}
                                >
                                    {t('compte.passwordModal.cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal confirmation suppression de compte */}
            {showDeletionModal && (
                <div className={styles.modalOverlay} onClick={handleCloseDeletionModal}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>{t('compte.deletionModal.title')}</h2>
                            <button
                                className={styles.modalCloseButton}
                                onClick={handleCloseDeletionModal}
                                disabled={requestingDeletion}
                                aria-label={t('compte.deletionModal.close')}
                            >
                                ✕
                            </button>
                        </div>

                        <div className={styles.deletionModalContent}>
                            {deletionError && (
                                <div className={styles.passwordError}>
                                    {deletionError}
                                </div>
                            )}
                            
                            {deletionSuccess && (
                                <div className={styles.passwordSuccess}>
                                    {t('compte.deletionRequestSuccess')}
                                </div>
                            )}

                            {!deletionSuccess && (
                                <>
                                    <p className={styles.deletionModalText}>
                                        {t('compte.deletionModal.message')}
                                    </p>
                                    <p className={styles.deletionModalInfo}>
                                        {t('compte.deletionModal.confirmationEmail')}
                                    </p>
                                    <div className={styles.deletionModalActions}>
                                        <button
                                            type="button"
                                            onClick={handleRequestAccountDeletion}
                                            disabled={requestingDeletion}
                                            className={styles.confirmDeleteButton}
                                        >
                                            {requestingDeletion ? t('compte.requestingDeletion') : t('compte.deletionModal.confirm')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCloseDeletionModal}
                                            disabled={requestingDeletion}
                                            className={styles.cancelDeleteButton}
                                        >
                                            {t('compte.deletionModal.cancel')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


