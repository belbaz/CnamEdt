"use client";

import { useEffect, useState } from "react";
import BackButton from "@/components/BackButton";
import styles from "../login/login.module.css";

/**
 * Composant client pour la connexion et l'affichage des notes Galao.
 * Gère le parsing HTML, le calcul des coefficients et l'affichage par UE.
 */
export default function NoteLoginClient() {
    // --- États du formulaire et de l'utilisateur ---
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uid, setUid] = useState(null);
    
    // --- États de gestion des erreurs et messages ---
    const [errorMessage, setErrorMessage] = useState("");
    const [infoMessage, setInfoMessage] = useState("");
    
    // --- États des données (Notes) ---
    const [notesLoading, setNotesLoading] = useState(false);
    const [notesError, setNotesError] = useState("");
    const [notesHtml, setNotesHtml] = useState("");
    const [hasExistingSession, setHasExistingSession] = useState(false);
    
    // --- États d'affichage (Parsing & UI) ---
    const [parsedNotes, setParsedNotes] = useState([]);
    const [ueCreditTotals, setUeCreditTotals] = useState({}); // Pour stocker le total ECTS par UE
    const [activeSemester, setActiveSemester] = useState("");
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    /**
     * Charge les notes depuis l'API (qui fait le scraping).
     */
    const loadNotes = async () => {
        try {
            setNotesLoading(true);
            setNotesError("");
            setNotesHtml("");

            const res = await fetch("/api/galao/notes");
            const data = await res.json();

            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Impossible de récupérer les notes Galao.");
            }

            const html = data.html || "";
            if (!html) {
                setNotesError("Réponse Galao vide.");
                return;
            }

            // Détection d'une session invalide ou expirée côté serveur Galao
            if (
                html.includes("ERREUR : requête non acceptée") ||
                html.includes("syntax error at or near")
            ) {
                handleSessionExpired("Votre session Galao a expiré. Merci de vous reconnecter.");
                return;
            }

            setNotesHtml(html);
        } catch (err) {
            console.warn("[NoteLogin] Erreur chargement", err);
            const message = err?.message || "";
            
            if (message.includes("Session Galao manquante")) {
                handleSessionExpired("Session expirée. Connectez-vous à nouveau.");
                return;
            }

            setNotesError(message || "Erreur inattendue lors du chargement des notes.");
        } finally {
            setNotesLoading(false);
        }
    };

    /**
     * Helper pour gérer l'expiration de session
     */
    const handleSessionExpired = (msg) => {
        setHasExistingSession(false);
        setNotesHtml("");
        setNotesError("");
        setInfoMessage("");
        setErrorMessage(msg);
        if (typeof document !== "undefined") {
            document.cookie = "galao_client=; Max-Age=0; path=/";
        }
    };

    /**
     * Parsing du HTML reçu pour extraire les données structurées.
     * C'est ici qu'on nettoie les lignes parasites et qu'on calcule les crédits.
     */
    useEffect(() => {
        if (!notesHtml) {
            setParsedNotes([]);
            return;
        }

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(notesHtml, "text/html");
            const result = [];

            // Fonction pour extraire les crédits (ECTS) depuis le texte (Intitulé + Détail)
            const extractCredits = (rawText) => {
                if (!rawText) return null;
                const text = rawText.replace(/\s+/g, " ").trim();
                const patterns = [
                    /cr[eé]dits?\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/i,
                    /(\d+(?:[.,]\d+)?)\s*(?:ects?)/i,
                ];

                for (const pattern of patterns) {
                    const match = text.match(pattern);
                    if (match && match[1]) {
                        const value = parseFloat(match[1].replace(",", "."));
                        if (!Number.isNaN(value)) return value;
                    }
                }
                return null;
            };

            const fiches = Array.from(doc.querySelectorAll("#fich1, #fich2"));

            fiches.forEach((fiche) => {
                const ueTables = Array.from(fiche.querySelectorAll("table.cadre_1C"));

                ueTables.forEach((table) => {
                    // Extraction Semestre et UE
                    const semFont = table.querySelector("font.txtmaple12_P127C");
                    const semestre = semFont ? semFont.textContent.replace(/\s+/g, " ").trim() : "";

                    const ueTitleFont = table.querySelector("tr font.txtmaple11_15C");
                    const ue = ueTitleFont ? ueTitleFont.textContent.replace(/\s+/g, " ").trim() : "";

                    const rows = Array.from(table.querySelectorAll("tr"));
                    if (rows.length < 3) return;

                    // On ignore les 2 premières lignes (Titre UE + Headers colonnes)
                    rows.slice(2).forEach((row) => {
                        const cells = Array.from(row.querySelectorAll("td"));
                        if (cells.length !== 6) return;

                        const [intituleCell, noteCell, minCell, moyCell, maxCell, detailCell] = cells;
                        const intituleText = intituleCell.textContent.replace(/\s+/g, " ").trim();

                        // --- FILTRES DE NETTOYAGE ---
                        if (!intituleText) return;
                        if (intituleText === "Intitulé") return; // Ligne d'en-tête répétée
                        if (intituleText.toLowerCase().startsWith("moyenne")) return; // Ligne de moyenne générale
                        
                        // Nettoyage des valeurs
                        const clean = (el) => {
                            const txt = el.textContent.replace(/\s+/g, " ").trim();
                            return (txt === "" || txt === "-") ? "–" : txt;
                        };

                        let noteValue = clean(noteCell);
                        if (noteValue === "Note") return; // Sécurité supplémentaire

                        // Séparation Code / Libellé
                        let code = "";
                        let label = intituleText;
                        const colonIndex = intituleText.indexOf(":");
                        if (colonIndex > 0) {
                            code = intituleText.slice(0, colonIndex).trim();
                            label = intituleText.slice(colonIndex + 1).trim();
                        }

                        const detail = clean(detailCell);
                        // On cherche les crédits dans le titre OU dans le détail
                        const credits = extractCredits(`${intituleText} ${detail}`);

                        result.push({
                            semestre,
                            ue,
                            code,
                            intitule: label,
                            note: noteValue,
                            min: clean(minCell),
                            moy: clean(moyCell),
                            max: clean(maxCell),
                            detail: detail,
                            credits: credits,
                        });
                    });
                });
            });

            // 1. Calcul des totaux de crédits par UE ET par semestre
            const totals = {};
            result.forEach((row) => {
                if (!row.ue || row.credits == null || Number.isNaN(row.credits)) return;
                const key = `${row.semestre}||${row.ue}`;
                totals[key] = (totals[key] || 0) + row.credits;
            });
            setUeCreditTotals(totals);

            // 2. Calcul du coefficient pour chaque matière (Crédits Matière / Total UE)
            const enhanced = result.map((row) => {
                const key = `${row.semestre}||${row.ue}`;
                const totalCreditsForUe = totals[key];
                let coef = null;
                if (totalCreditsForUe && Number.isFinite(totalCreditsForUe) && row.credits != null) {
                    coef = row.credits / totalCreditsForUe;
                }
                return { ...row, coef };
            });

            setParsedNotes(enhanced);
        } catch (parseError) {
            console.warn("[NoteLogin] Erreur parsing HTML", parseError);
            setParsedNotes([]);
        }
    }, [notesHtml]);

    /**
     * Sélectionne automatiquement le dernier semestre disponible par défaut
     */
    useEffect(() => {
        if (!parsedNotes.length) return;
        const semesters = Array.from(new Set(parsedNotes.map((r) => r.semestre).filter(Boolean)));
        
        if (!semesters.length) return;
        
        if (!activeSemester || !semesters.includes(activeSemester)) {
            // Prend le dernier semestre de la liste (souvent le plus récent)
            setActiveSemester(semesters[semesters.length - 1]);
        }
    }, [parsedNotes, activeSemester]);

    /**
     * Gestion de la soumission du formulaire de connexion
     */
    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrorMessage("");
        setInfoMessage("");
        setUid(null);
        setNotesError("");
        setNotesHtml("");

        if (!username.trim() || !password.trim()) {
            setErrorMessage("Merci de renseigner vos identifiants.");
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await fetch("/api/galao/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const payload = await response.json();

            if (!response.ok || !payload?.success) {
                throw new Error(payload?.error || "Impossible de se connecter.");
            }

            setUid(payload.uid || null);
            setInfoMessage("Connexion réussie.");
            await loadNotes();
        } catch (err) {
            setErrorMessage(err.message || "Erreur de connexion.");
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Déconnexion
     */
    const handleLogout = async () => {
        setErrorMessage(""); setInfoMessage(""); setNotesError(""); setNotesHtml("");
        setParsedNotes([]); setActiveSemester(""); setUid(null); setHasExistingSession(false);

        try {
            setIsLoggingOut(true);
            await fetch("/api/galao/logout", { method: "POST" });
            if (typeof document !== "undefined") {
                document.cookie = "galao_client=; Max-Age=0; path=/";
            }
            setInfoMessage("Déconnexion réussie.");
        } catch (err) {
            console.warn("Erreur logout", err);
        } finally {
            setIsLoggingOut(false);
        }
    };

    /**
     * Vérification automatique de la session au chargement
     */
    useEffect(() => {
        if (typeof document === "undefined") return;
        const hasClientFlag = document.cookie.split(";").some((c) => c.trim().startsWith("galao_client="));
        if (hasClientFlag) {
            setHasExistingSession(true);
            loadNotes();
        }
    }, []);

    const showNotesOnly = !notesLoading && !notesError && !!notesHtml;

    return (
        <div className={styles.page}>
            <div className={styles.notePage}>
                <BackButton href="/" title="Retour" />

                <div className={styles.formCard}>
                    {/* --- ÉCRAN DE CONNEXION --- */}
                    {!showNotesOnly && !hasExistingSession && (
                        <>
                            <header className={styles.cardHeader}>
                                <h2>Connexion Galao (Notes)</h2>
                                <p className={styles.cardSubhead}>
                                    Utilisez vos identifiants Cnam (User/Pass).
                                </p>
                            </header>

                            {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}
                            {infoMessage && <div className={styles.successBanner}>{infoMessage}</div>}

                            <form className={styles.form} onSubmit={handleSubmit}>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="galao-username">Utilisateur</label>
                                    <input
                                        id="galao-username"
                                        type="text"
                                        placeholder="Nom d'utilisateur"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="galao-password">Mot de passe</label>
                                    <input
                                        id="galao-password"
                                        type="password"
                                        placeholder="Mot de passe"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                                    {isSubmitting ? "Connexion..." : "Voir mes notes"}
                                </button>
                            </form>
                            <div className={styles.formFooter}>
                                <p>Aucune donnée n'est enregistrée sur nos serveurs.</p>
                            </div>
                        </>
                    )}

                    {/* --- AFFICHAGE DES NOTES --- */}
                    {(notesLoading || notesError || notesHtml) && (
                        <div style={{ marginTop: "1rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                                <h3 style={{ margin: 0 }}>Relevé de notes</h3>
                                {(hasExistingSession || notesHtml) && (
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className={styles.logoutButton}
                                        disabled={isLoggingOut}
                                    >
                                        {isLoggingOut ? "..." : "Déconnexion"}
                                    </button>
                                )}
                            </div>

                            {notesLoading && (
                                <div className={styles.loadingState}>
                                    <span className={styles.loader} /> Chargement des notes...
                                </div>
                            )}
                            
                            {notesError && <p style={{ color: "#b91c1c" }}>{notesError}</p>}

                            {!notesLoading && !notesError && notesHtml && (
                                <>
                                    {parsedNotes.length > 0 ? (
                                        <>
                                            {/* 1. Onglets Semestres */}
                                            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                                                {Array.from(new Set(parsedNotes.map((r) => r.semestre))).map((sem) => (
                                                    <button
                                                        key={sem}
                                                        onClick={() => setActiveSemester(sem)}
                                                        className={styles.submitButton}
                                                        style={{
                                                            minWidth: "auto",
                                                            padding: "0.5rem 1rem",
                                                            fontSize: "0.9rem",
                                                            opacity: activeSemester === sem ? 1 : 0.6,
                                                            backgroundColor: activeSemester === sem ? "var(--primary)" : "var(--bg-secondary)",
                                                            color: activeSemester === sem ? "#fff" : "var(--text-primary)",
                                                            boxShadow: activeSemester === sem ? "0 4px 10px rgba(0,0,0,0.15)" : "none"
                                                        }}
                                                    >
                                                        {sem}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* 2. Affichage par UE (Cartes) */}
                                            {(() => {
                                                const rowsForSemester = parsedNotes.filter(r => r.semestre === activeSemester);
                                                
                                                // Groupement par UE
                                                const ueGroups = rowsForSemester.reduce((acc, row) => {
                                                    const key = row.ue || "Autres";
                                                    if (!acc[key]) acc[key] = [];
                                                    acc[key].push(row);
                                                    return acc;
                                                }, {});

                                                return Object.entries(ueGroups).map(([ueName, rows]) => {
                                                    // Récupérer le total calculé plus tôt (clé = semestre + UE)
                                                    const ueKey = `${activeSemester}||${ueName}`;
                                                    const totalCreditsUE = ueCreditTotals[ueKey] || 0;

                                                    return (
                                                        <div 
                                                            key={ueName}
                                                            style={{
                                                                marginBottom: "2rem",
                                                                backgroundColor: "var(--bg-secondary)", 
                                                                borderRadius: "12px",
                                                                border: "1px solid var(--border-light)",
                                                                padding: "1.25rem",
                                                                boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                                                            }}
                                                        >
                                                            {/* En-tête de la carte UE */}
                                                            <div style={{
                                                                display: 'flex', 
                                                                justifyContent:'space-between', 
                                                                alignItems:'center', 
                                                                marginBottom: '1rem',
                                                                borderBottom: '1px solid var(--border-light)',
                                                                paddingBottom: '0.75rem'
                                                            }}>
                                                                <h4 style={{ margin: 0, color: "var(--primary)", fontSize: '1.1rem', fontWeight: '600' }}>
                                                                    {ueName}
                                                                </h4>
                                                                {totalCreditsUE > 0 && (
                                                                    <span style={{ 
                                                                        fontSize: '0.8rem', 
                                                                        fontWeight: 'bold', 
                                                                        color: 'var(--text-secondary)',
                                                                        backgroundColor: 'var(--bg-tertiary)',
                                                                        padding: '4px 8px',
                                                                        borderRadius: '4px'
                                                                    }}>
                                                                        Total : {totalCreditsUE} ECTS
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Tableau des modules de l'UE */}
                                                            <div className={styles.notesTableWrapper}>
                                                                <table className={styles.notesTable} style={{border:'none', boxShadow:'none'}}>
                                                                    <thead>
                                                                        <tr>
                                                                            <th style={{width: '40%'}}>Matière</th>
                                                                            <th style={{width: '10%'}}>Code</th>
                                                                            <th style={{width: '15%'}}>Note</th>
                                                                            <th style={{width: '15%'}}>Min/Max</th>
                                                                            <th style={{width: '20%', textAlign:'right'}}>Crédits & Coef</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {rows.map((row, idx) => {
                                                                            const numericNote = parseFloat((row.note || "").replace(",", "."));
                                                                            const isNoteValid = !isNaN(numericNote) && row.note !== "–";
                                                                            const noteClass = isNoteValid 
                                                                                ? (numericNote >= 10 ? styles.notesTableNoteGood : styles.notesTableNoteBad) 
                                                                                : "";
                                                                            
                                                                            // Affichage Crédits / Total (Coef)
                                                                            let creditDisplay = <span style={{color:'var(--text-tertiary)'}}>–</span>;
                                                                            
                                                                            if (row.credits != null && totalCreditsUE > 0) {
                                                                                const coefDisplay =
                                                                                    row.coef != null && Number.isFinite(row.coef)
                                                                                        ? row.coef.toFixed(2)
                                                                                        : "?";

                                                                                const formatCredit = (value) => {
                                                                                    if (value == null || Number.isNaN(value)) {
                                                                                        return "–";
                                                                                    }
                                                                                    return Number.isInteger(value)
                                                                                        ? value.toString()
                                                                                        : value.toFixed(1).replace(".", ",");
                                                                                };
                                                                                creditDisplay = (
                                                                                    <div style={{lineHeight: '1.2'}}>
                                                                                        <span style={{fontWeight:'600'}}>
                                                                                            {formatCredit(row.credits)}
                                                                                        </span>
                                                                                        <span style={{color:'var(--text-tertiary)', fontSize:'0.85em'}}>
                                                                                            {" "}
                                                                                            / {formatCredit(totalCreditsUE)}
                                                                                        </span>
                                                                                        <div style={{color:'var(--text-secondary)', fontSize:'0.75em', marginTop:'2px'}}>
                                                                                            Coef: {coefDisplay}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            }

                                                                            return (
                                                                                <tr key={idx} style={{borderBottom: idx === rows.length -1 ? 'none' : '1px solid var(--border-light)'}}>
                                                                                    <td style={{fontWeight: '500'}}>{row.intitule}</td>
                                                                                    <td className={styles.notesTableCode} style={{fontSize:'0.85rem'}}>{row.code}</td>
                                                                                    <td>
                                                                                        <span className={`${styles.notesTableNote} ${noteClass}`}>
                                                                                            {row.note}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td style={{fontSize:'0.8em', color:'var(--text-secondary)', lineHeight:'1.4'}}>
                                                                                        <div>Min: {row.min}</div>
                                                                                        <div>Max: {row.max}</div>
                                                                                    </td>
                                                                                    <td style={{textAlign:'right'}}>
                                                                                        {creditDisplay}
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </>
                                    ) : (
                                        <p style={{textAlign: 'center', color: 'var(--text-secondary)'}}>
                                            Aucune note trouvée pour ce dossier.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}