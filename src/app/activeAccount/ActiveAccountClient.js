"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./activate.module.css";

const LOG_PREFIX = "[ActiveAccount]";

export default function ActiveAccountClient() {
    const searchParams = useSearchParams();
    const [token, setToken] = useState("");
    const [status, setStatus] = useState({ type: "info", message: "Validation du lien en cours..." });
    const [email, setEmail] = useState("");
    const [expiresAt, setExpiresAt] = useState(null);
    const [isValidToken, setIsValidToken] = useState(false);
    const [isActivating, setIsActivating] = useState(false);
    const [activationSuccess, setActivationSuccess] = useState(false);
    const [isCheckingToken, setIsCheckingToken] = useState(true);

    useEffect(() => {
        const urlToken = searchParams.get("token") || "";
        setToken(urlToken);
    }, [searchParams]);

    useEffect(() => {
        let isMounted = true;

        if (!token) {
            setStatus({ type: "error", message: "Lien d'activation invalide." });
            setIsValidToken(false);
            setIsCheckingToken(false);
            return () => {
                isMounted = false;
            };
        }

        const validateToken = async () => {
            setIsCheckingToken(true);
            try {
                const response = await fetch("/api/activate-account", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token, action: "validate" }),
                });

                const payload = await response.json();

                if (!response.ok || !payload?.valid) {
                    throw new Error(payload?.error || "Lien expiré ou invalide.");
                }

                if (!isMounted) return;
                setIsValidToken(true);
                setEmail(payload.email);
                setExpiresAt(payload.expiresAt);
                setStatus({
                    type: "success",
                    message: "Lien valide. Vous pouvez activer votre compte.",
                });
            } catch (error) {
                console.warn(`${LOG_PREFIX} Validation échouée`, error);
                if (!isMounted) return;
                setIsValidToken(false);
                setStatus({
                    type: "error",
                    message: error.message || "Lien expiré ou invalide.",
                });
            } finally {
                if (isMounted) {
                    setIsCheckingToken(false);
                }
            }
        };

        validateToken();

        return () => {
            isMounted = false;
        };
    }, [token]);

    const handleActivation = async () => {
        if (!token || !isValidToken) return;

        try {
            setIsActivating(true);
            setStatus({ type: "info", message: "Activation en cours..." });
            const response = await fetch("/api/activate-account", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload?.error || "Activation impossible.");
            }

            setActivationSuccess(true);
            setStatus({
                type: "success",
                message: "Compte activé ! Vous pouvez vous connecter.",
            });
        } catch (error) {
            console.error(`${LOG_PREFIX} Activation échouée`, error);
            setActivationSuccess(false);
            setStatus({
                type: "error",
                message: error.message || "Activation impossible pour le moment.",
            });
        } finally {
            setIsActivating(false);
        }
    };

    const renderStatusBanner = () => (
        <div className={`${styles.statusBanner} ${styles[status.type]}`}>
            {isCheckingToken ? (
                <span className={styles.bannerLoader}>
                    <span className={styles.loader} aria-hidden="true" />
                    Vérification du lien en cours...
                </span>
            ) : (
                status.message
            )}
        </div>
    );

    return (
        <div className={styles.page}>
            <div className={styles.wrapper}>
                <div className={styles.card}>
                    {renderStatusBanner()}

                    {email && (
                        <div className={styles.detailBox}>
                            <p>
                                Adresse concernée : <strong>{email}</strong>
                            </p>
                            {expiresAt && (
                                <p>
                                    Expire à :{" "}
                                    <time dateTime={new Date(expiresAt).toISOString()}>
                                        {new Date(expiresAt).toLocaleTimeString("fr-FR", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </time>
                                </p>
                            )}
                        </div>
                    )}

                    <button
                        type="button"
                        className={styles.submitButton}
                        onClick={handleActivation}
                        disabled={!isValidToken || isActivating || activationSuccess}
                    >
                        {isActivating ? "Activation en cours..." : activationSuccess ? "Compte activé" : "Activer mon compte"}
                    </button>
                </div>
            </div>
        </div>
    );
}


