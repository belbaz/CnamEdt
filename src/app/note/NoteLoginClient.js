"use client";

import { useEffect, useState } from "react";
import BackButton from "@/components/BackButton";
import styles from "../login/login.module.css";
import { useI18n } from "@/i18n/I18nContext";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import KeepAlive from "@/components/KeepAlive";

const NOTES_LAST_SEMESTER_KEY = "notes_last_semester";

/**
 * Composant client pour la connexion et l'affichage des notes Galao.
 * Gère le parsing HTML, le calcul des coefficients et l'affichage par UE.
 */
export default function NoteLoginClient() {
    const { t } = useI18n();
    // --- États du formulaire et de l'utilisateur ---
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uid, setUid] = useState(null);

    // --- États de gestion des erreurs et messages ---
    const [errorMessage, setErrorMessage] = useState("");
    const [infoMessage, setInfoMessage] = useState("");

    // --- États des données (Notes) et UI ---
    const [notesLoading, setNotesLoading] = useState(false);
    const [notesError, setNotesError] = useState("");
    const [notesHtml, setNotesHtml] = useState("");
    const [hasExistingSession, setHasExistingSession] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false); // État pour l'animation de sortie du form
    const [isLoginSuccess, setIsLoginSuccess] = useState(false);   // État pour le feedback visuel (bouton vert) avant transition

    // --- États d'affichage (Parsing & UI) ---
    const [parsedNotes, setParsedNotes] = useState([]);
    const [ueAverages, setUeAverages] = useState({}); // Moyennes générales par UE
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
                throw new Error(data?.error || t('galao.fetchError'));
            }

            const html = data.html || "";
            if (!html) {
                setNotesError(t('galao.emptyResponse'));
                return;
            }

            // Détection d'une session invalide ou expirée côté serveur Galao
            if (
                html.includes("ERREUR : requête non acceptée") ||
                html.includes("syntax error at or near")
            ) {
                handleSessionExpired(t('galao.sessionExpired'));
                return;
            }

            setNotesHtml(html);
        } catch (err) {
            console.warn("[NoteLogin] Erreur chargement", err);
            const message = err?.message || "";

            if (message.includes("Session Galao manquante")) {
                handleSessionExpired(t('galao.sessionExpired'));
                return;
            }

            setNotesError(message || t('galao.unexpectedError'));
        } finally {
            setNotesLoading(false);
            setIsTransitioning(false); // Fin de transition si erreur ou succès
            setIsLoginSuccess(false);
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
     */
    useEffect(() => {
        if (!notesHtml) {
            setParsedNotes([]);
            setUeAverages({});
            return;
        }

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(notesHtml, "text/html");
            const result = [];
            const averages = {};

            const fiches = Array.from(doc.querySelectorAll("#fich1, #fich2"));

            fiches.forEach((fiche) => {
                const ueTables = Array.from(fiche.querySelectorAll("table.cadre_1C"));

                ueTables.forEach((table) => {
                    // Extraction Semestre (reste global pour le tableau)
                    const semFont = table.querySelector("font.txtmaple12_P127C");
                    const semestre = semFont ? semFont.textContent.replace(/\s+/g, " ").trim() : "";

                    const rows = Array.from(table.querySelectorAll("tr"));
                    if (rows.length < 3) return;

                    let currentUE = ""; // UE courante, mise à jour au fur et à mesure

                    rows.forEach((row) => {
                        // Détecter si cette ligne contient un titre d'UE
                        const ueTitleFont = row.querySelector("font.txtmaple11_15C");
                        if (ueTitleFont) {
                            currentUE = ueTitleFont.textContent.replace(/\s+/g, " ").trim();
                            return; // Cette ligne est juste un titre, on passe à la suivante
                        }

                        const cells = Array.from(row.querySelectorAll("td"));
                        if (cells.length < 2) return;

                        // Cas ligne spéciale (Moyenne)
                        const firstCellText = cells[0]?.textContent?.replace(/\s+/g, " ").trim() || "";
                        if (firstCellText.toLowerCase().startsWith("moyenne")) {
                            const moyNote = cells[1]?.textContent?.replace(/\s+/g, " ").trim();
                            if (currentUE && semestre) {
                                const key = `${semestre}||${currentUE}`;
                                averages[key] = moyNote || "";
                            }
                            return;
                        }

                        if (cells.length !== 6) return;

                        const [c1, c2, c3, c4, c5, c6] = cells;
                        const intituleText = c1.textContent.replace(/\s+/g, " ").trim();

                        if (!intituleText) return;
                        if (intituleText === "Intitulé") return;

                        const clean = (el) => {
                            const txt = el.textContent.replace(/\s+/g, " ").trim();
                            return (txt === "" || txt === "-") ? "" : txt;
                        };

                        let noteValue = clean(c2);
                        if (noteValue === "Note") return;

                        const colonIndex = intituleText.indexOf(":");
                        let code = "";
                        let label = intituleText;
                        if (colonIndex > 0) {
                            code = intituleText.slice(0, colonIndex).trim();
                            label = intituleText.slice(colonIndex + 1).trim();
                        }

                        result.push({
                            semestre,
                            ue: currentUE, // Utiliser l'UE courante
                            code,
                            intitule: label,
                            fullIntitule: intituleText,
                            note: noteValue,
                            min: clean(c3),
                            moy: clean(c4),
                            max: clean(c5),
                            detail: clean(c6),
                        });
                    });
                });
            });

            setUeAverages(averages);
            setParsedNotes(result);

            // Debug: afficher le nombre d'UE trouvées
            const uniqueUEs = [...new Set(result.map(r => r.ue).filter(Boolean))];
            console.log(`[NoteLogin] ${result.length} notes parsées, ${uniqueUEs.length} UE distinctes:`, uniqueUEs);

            // Si on a reçu du HTML mais aucune note parsée, la session est probablement expirée
            if (result.length === 0 && notesHtml && notesHtml.length > 100) {
                console.warn("[NoteLogin] HTML reçu mais aucune note trouvée - session expirée ?");
                handleSessionExpired(t('galao.sessionExpired'));
            }
        } catch (parseError) {
            console.warn("[NoteLogin] Erreur parsing HTML", parseError);
            setParsedNotes([]);
        }
    }, [notesHtml]);

    /**
     * Sélectionne le dernier semestre (mémorisé) ou le premier par défaut
     */
    useEffect(() => {
        if (!parsedNotes.length) return;
        const semesters = Array.from(new Set(parsedNotes.map((r) => r.semestre).filter(Boolean)));

        if (!semesters.length) return;

        if (!activeSemester || !semesters.includes(activeSemester)) {
            let chosen = semesters[0];
            if (typeof localStorage !== "undefined") {
                const saved = localStorage.getItem(NOTES_LAST_SEMESTER_KEY);
                if (saved && semesters.includes(saved)) chosen = saved;
            }
            setActiveSemester(chosen);
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
            setErrorMessage(t('galao.missingCredentials'));
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
                throw new Error(payload?.error || t('galao.connectionFailed'));
            }

            setUid(payload.uid || null);
            setInfoMessage(t('galao.loginSuccess'));

            // --- PHASE 1 : SUCCÈS VISUEL (STABLE) ---
            setIsLoginSuccess(true);

            // Lancer le chargement immédiatement
            const loadingPromise = loadNotes();

            // Attendre 400ms avec le formulaire stable (bouton vert)
            await new Promise(resolve => setTimeout(resolve, 400));

            // --- PHASE 2 : DÉBUT ANIMATION SORTIE ---
            setIsLoginSuccess(false);
            setIsTransitioning(true); // Déclenche le fadeOut CSS

            await loadingPromise;

        } catch (err) {
            setErrorMessage(err.message || t('galao.loginError'));
            setIsSubmitting(false); // Retirer l'état de soumission si erreur
            setIsTransitioning(false);
            setIsLoginSuccess(false);
        }
    };

    /**
     * Déconnexion
     */
    /**
     * Export des notes en PDF
     */
    const handleExportPDF = async () => {
        const element = document.getElementById('notes-content');
        if (!element) return;

        try {
            // Créer un canvas de l'élément avec un fond blanc forcé pour l'impression
            const canvas = await html2canvas(element, {
                scale: 2, // Meilleure qualité
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff', // Fond blanc pour document propre
                ignoreElements: (element) => element.tagName === 'BUTTON', // Ignorer les boutons
                onclone: (document) => {
                    const el = document.getElementById('notes-content');
                    if (el) {
                        // Reset container style
                        el.style.backgroundColor = '#ffffff';
                        el.style.color = '#000000';

                        // Force black text and white background on EVERYTHING
                        const allElements = el.querySelectorAll('*');
                        allElements.forEach(element => {
                            // Force styles
                            element.style.color = '#000000';
                            element.style.backgroundColor = '#ffffff';
                            element.style.background = '#ffffff'; // Override gradients
                            element.style.backgroundImage = 'none';
                            element.style.textShadow = 'none';
                            element.style.boxShadow = 'none';
                        });
                    }
                }
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 190; // Largeur image (A4 - marges)
            const pageHeight = 297;
            const pageWidth = 210;
            const margin = 10;

            // En-tête personnalisé
            pdf.setFontSize(18);
            pdf.setTextColor(40, 40, 40);
            pdf.text(t('galao.pdf.title'), margin, 20);

            pdf.setFontSize(10);
            pdf.setTextColor(100, 100, 100);
            const date = new Date().toLocaleDateString(t('settings.language') === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
            pdf.text(`${t('galao.pdf.generatedOn')} ${date}`, margin, 28);
            pdf.text(activeSemester || t('galao.pdf.all'), margin, 33);

            pdf.setLineWidth(0.5);
            pdf.setDrawColor(200, 200, 200);
            pdf.line(margin, 38, pageWidth - margin, 38);

            // Calcul hauteur image
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 45; // Commencer après l'en-tête

            // Ajouter la première page
            pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
            heightLeft -= (pageHeight - position);

            // Ajouter des pages supplémentaires si nécessaire
            while (heightLeft > 0) {
                position = heightLeft - imgHeight; // Ajustement position pour page suivante
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', margin, - (imgHeight - heightLeft - margin), imgWidth, imgHeight); // Complex calculation for accurate stitching
                heightLeft -= (pageHeight - margin * 2);
            }

            // Télécharger le PDF
            pdf.save(`Notes_Galao_${activeSemester || 'Tous'}.pdf`);
        } catch (error) {
            console.error('Erreur lors de la génération du PDF:', error);
            alert('Erreur lors de la génération du PDF');
        }
    };

    /**
     * Déconnexion Galao
     */
    const handleLogout = async () => {
        setErrorMessage("");
        setInfoMessage("");
        setNotesError("");
        setNotesHtml("");
        setParsedNotes([]);
        setActiveSemester("");
        setUid(null);
        setHasExistingSession(false);
        setIsSubmitting(false);  // Réinitialiser l'état de soumission
        setIsTransitioning(false);
        setIsLoginSuccess(false);

        try {
            setIsLoggingOut(true);
            await fetch("/api/galao/logout", { method: "POST" });
            if (typeof document !== "undefined") {
                document.cookie = "galao_client=; Max-Age=0; path=/";
            }
            setInfoMessage(t('galao.logoutSuccess'));
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
    const showLoginOrLoader = !showNotesOnly;

    return (
        <div className={styles.page}>
            {/* CONTENEUR COMPACT : Login + Loader */}
            {showLoginOrLoader && (
                <div className={styles.notePage} style={{
                    maxWidth: '550px',
                    transition: 'opacity 0.3s ease'
                }}>
                    <BackButton href="/" title="Retour" />

                    <div className={styles.formCard}>
                        {/* --- ÉCRAN DE CONNEXION --- */}
                        {!hasExistingSession && !notesLoading && (isTransitioning || isLoginSuccess || !notesHtml) && (
                            <div className={isTransitioning ? styles.fadeOut : styles.fadeIn}>
                                <header className={styles.cardHeader}
                                    style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                                    <div>
                                        <h2>{t('galao.title')}</h2>
                                    </div>
                                    <div>
                                        <p className={styles.cardSubhead}>
                                            {t('galao.subtitle')}
                                        </p>
                                    </div>
                                </header>

                                {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}
                                {infoMessage && <div className={styles.successBanner}>{infoMessage}</div>}

                                <form className={styles.form} onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
                                    <div className={styles.inputGroup}>
                                        <label htmlFor="galao-username">{t('galao.username')}</label>
                                        <input
                                            id="galao-username"
                                            type="text"
                                            placeholder={t('galao.username')}
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                            disabled={isSubmitting || isTransitioning || isLoginSuccess}
                                        />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label htmlFor="galao-password">{t('galao.password')}</label>
                                        <input
                                            id="galao-password"
                                            type="password"
                                            placeholder={t('galao.password')}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            disabled={isSubmitting || isTransitioning || isLoginSuccess}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className={styles.submitButton}
                                        disabled={isSubmitting || isTransitioning || isLoginSuccess}
                                        style={(isTransitioning || isLoginSuccess) ? {
                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                            transform: 'scale(1.02)'
                                        } : {}}
                                    >
                                        {(isTransitioning || isLoginSuccess) ? t('galao.loginSuccess') : (isSubmitting ? t('galao.loggingIn') : t('galao.login'))}
                                    </button>
                                </form>
                                <div className={styles.formFooter}>
                                    <p>{t('galao.privacyNote')}</p>
                                </div>
                            </div>
                        )}

                        {/* --- LOADER COMPACT --- */}
                        {notesLoading && (
                            <div className={styles.fadeIn} style={{
                                padding: '2.5rem 1rem',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '1.5rem'
                            }}>
                                <div className={styles.modernLoader}></div>
                                <div className={styles.loaderText}>{t('galao.loading')}</div>
                            </div>
                        )}

                        {/* --- ERREUR --- */}
                        {notesError && !isTransitioning && !isLoginSuccess && (
                            <div style={{ padding: '1rem', textAlign: 'center' }}>
                                <p style={{ color: "#b91c1c", fontWeight: 'bold' }}>{notesError}</p>
                                <button
                                    onClick={() => {
                                        setNotesError("");
                                        setNotesLoading(false);
                                    }}
                                    className={styles.submitButton}
                                    style={{ marginTop: '1rem', background: 'var(--text-secondary)' }}
                                >
                                    {t('galao.retry')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CONTENEUR LARGE : Affichage des notes */}
            {showNotesOnly && (
                <div className={styles.notePage} style={{
                    maxWidth: '1200px',
                    background: 'transparent',
                    boxShadow: 'none',
                    border: 'none'
                }}>
                    <BackButton href="/" title="Retour" />

                    <div className={styles.formCard} style={{
                        background: 'transparent',
                        padding: '0',
                        border: 'none',
                        boxShadow: 'none'
                    }}>
                        {!notesLoading && !notesError && notesHtml && !isTransitioning && !isLoginSuccess && (
                            <div className={styles.fadeIn}
                                style={showNotesOnly ? { width: '100%' } : { marginTop: "1rem" }}>
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "1.5rem"
                                }}>
                                    <h3 style={showNotesOnly ? {
                                        margin: 0,
                                        color: 'var(--text-primary)',
                                        fontSize: '1.5rem',
                                        textAlign: 'left',
                                        fontWeight: '800'
                                    } : { margin: 0 }}>
                                        {showNotesOnly ? `${t('galao.results')} - ${activeSemester}` : t('galao.transcript')}
                                    </h3>

                                    {showNotesOnly && (
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button
                                                onClick={handleExportPDF}
                                                className={styles.submitButton}
                                                style={{
                                                    boxShadow: 'var(--shadow-sm)',
                                                    background: 'var(--primary-color)',
                                                    padding: '0.5rem 1rem',
                                                    fontSize: '0.9rem'
                                                }}
                                            >
                                                {t('galao.downloadPdf')}
                                            </button>
                                            <button
                                                onClick={handleLogout}
                                                className={styles.logoutButton}
                                                style={{ boxShadow: 'var(--shadow-sm)' }}
                                            >
                                                {t('galao.logout')}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {parsedNotes.length > 0 ? (
                                    <div id="notes-content">
                                        <KeepAlive />
                                        {/* 1. Onglets Semestres */}
                                        <div style={{
                                            display: "flex",
                                            gap: "0.5rem",
                                            marginBottom: "2rem",
                                            overflowX: 'auto',
                                            paddingTop: '5px'
                                        }}>
                                            {Array.from(new Set(parsedNotes.map((r) => r.semestre))).map((sem) => (
                                                <button
                                                    key={sem}
                                                    onClick={() => {
                                                        setActiveSemester(sem);
                                                        if (typeof localStorage !== "undefined") {
                                                            localStorage.setItem(NOTES_LAST_SEMESTER_KEY, sem);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: "0.5rem 1rem",
                                                        fontSize: "0.9rem",
                                                        borderRadius: "12px",
                                                        border: '1px solid',
                                                        cursor: 'pointer',
                                                        whiteSpace: 'nowrap',
                                                        transition: 'all 0.2s',
                                                        background: activeSemester === sem ? 'var(--primary-color)' : 'var(--bg-secondary)',
                                                        color: activeSemester === sem ? '#ffffff' : 'var(--text-secondary)',
                                                        borderColor: activeSemester === sem ? 'var(--primary-color)' : 'var(--border-color)',
                                                        boxShadow: activeSemester === sem ? 'var(--shadow-md)' : 'none'
                                                    }}
                                                >
                                                    {sem}
                                                </button>
                                            ))}
                                        </div>

                                        {/* 2. Affichage par UE (Tableaux) */}
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
                                                const ueKey = `${activeSemester}||${ueName}`;
                                                const average = ueAverages[ueKey]; // Moyenne générale de l'UE

                                                return (
                                                    <div
                                                        key={ueName}
                                                        style={{
                                                            marginBottom: "1.5rem",
                                                            borderRadius: "16px",
                                                            overflow: "hidden",
                                                            background: 'var(--bg-secondary)',
                                                            border: '1px solid var(--border-light)',
                                                            boxShadow: 'var(--shadow-sm)'
                                                        }}
                                                    >
                                                        {/* Titre UE */}
                                                        <div style={{
                                                            padding: '1rem 1.25rem',
                                                            borderBottom: '1px solid var(--border-light)',
                                                            background: 'var(--bg-tertiary)'
                                                        }}>
                                                            <h4 style={{
                                                                margin: 0,
                                                                color: 'var(--text-primary)',
                                                                fontWeight: '700',
                                                                fontSize: '1rem'
                                                            }}>
                                                                {ueName}
                                                            </h4>
                                                        </div>

                                                        {/* Tableau */}
                                                        <div className={styles.notesTableWrapper} style={{
                                                            margin: 0,
                                                            padding: 0,
                                                            boxShadow: 'none',
                                                            border: 'none',
                                                            borderRadius: 0
                                                        }}>
                                                            <table className={styles.notesTable}>
                                                                <thead>
                                                                    <tr>
                                                                        <th style={{
                                                                            background: 'var(--bg-secondary)',
                                                                            color: 'var(--text-muted)',
                                                                            borderBottom: '1px solid var(--border-color)',
                                                                            fontWeight: '600',
                                                                            fontSize: '0.75rem',
                                                                            letterSpacing: '0.05em'
                                                                        }}>{t('galao.table.label')}
                                                                        </th>
                                                                        <th style={{
                                                                            background: 'var(--bg-secondary)',
                                                                            color: 'var(--text-muted)',
                                                                            borderBottom: '1px solid var(--border-color)',
                                                                            fontWeight: '600',
                                                                            fontSize: '0.75rem',
                                                                            letterSpacing: '0.05em',
                                                                            textAlign: 'center'
                                                                        }}>{t('galao.table.grade')}
                                                                        </th>
                                                                        <th style={{
                                                                            background: 'var(--bg-secondary)',
                                                                            color: 'var(--text-muted)',
                                                                            borderBottom: '1px solid var(--border-color)',
                                                                            fontWeight: '600',
                                                                            fontSize: '0.75rem',
                                                                            letterSpacing: '0.05em',
                                                                            textAlign: 'center'
                                                                        }}>{t('galao.table.min')}
                                                                        </th>
                                                                        <th style={{
                                                                            background: 'var(--bg-secondary)',
                                                                            color: 'var(--text-muted)',
                                                                            borderBottom: '1px solid var(--border-color)',
                                                                            fontWeight: '600',
                                                                            fontSize: '0.75rem',
                                                                            letterSpacing: '0.05em',
                                                                            textAlign: 'center'
                                                                        }}>{t('galao.table.avg')}
                                                                        </th>
                                                                        <th style={{
                                                                            background: 'var(--bg-secondary)',
                                                                            color: 'var(--text-muted)',
                                                                            borderBottom: '1px solid var(--border-color)',
                                                                            fontWeight: '600',
                                                                            fontSize: '0.75rem',
                                                                            letterSpacing: '0.05em',
                                                                            textAlign: 'center'
                                                                        }}>{t('galao.table.max')}
                                                                        </th>
                                                                        <th style={{
                                                                            background: 'var(--bg-secondary)',
                                                                            color: 'var(--text-muted)',
                                                                            borderBottom: '1px solid var(--border-color)',
                                                                            fontWeight: '600',
                                                                            fontSize: '0.75rem',
                                                                            letterSpacing: '0.05em',
                                                                            textAlign: 'right'
                                                                        }}>{t('galao.table.detail')}
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {rows.map((row, idx) => {
                                                                        const hasNote = row.note && row.note.trim() !== "";
                                                                        return (
                                                                            <tr key={idx}
                                                                                style={{ borderBottom: '1px solid var(--border-light)' }}>
                                                                                <td style={{
                                                                                    padding: '0.8rem 1.25rem',
                                                                                    fontWeight: '500',
                                                                                    color: 'var(--text-primary)',
                                                                                    border: 'none'
                                                                                }}>
                                                                                    {row.fullIntitule}
                                                                                </td>
                                                                                <td style={{
                                                                                    padding: '0.8rem',
                                                                                    textAlign: 'center',
                                                                                    color: hasNote ? (parseFloat(row.note.replace(',', '.')) >= 10 ? '#10b981' : '#ef4444') : 'inherit',
                                                                                    fontWeight: '700',
                                                                                    border: 'none',
                                                                                    fontSize: '0.95rem'
                                                                                }}>
                                                                                    {row.note}
                                                                                </td>
                                                                                <td style={{
                                                                                    padding: '0.8rem',
                                                                                    textAlign: 'center',
                                                                                    color: 'var(--text-muted)',
                                                                                    border: 'none',
                                                                                    fontSize: '0.85rem'
                                                                                }}>{row.min}</td>
                                                                                <td style={{
                                                                                    padding: '0.8rem',
                                                                                    textAlign: 'center',
                                                                                    color: 'var(--text-muted)',
                                                                                    border: 'none',
                                                                                    fontSize: '0.85rem'
                                                                                }}>{row.moy}</td>
                                                                                <td style={{
                                                                                    padding: '0.8rem',
                                                                                    textAlign: 'center',
                                                                                    color: 'var(--text-muted)',
                                                                                    border: 'none',
                                                                                    fontSize: '0.85rem'
                                                                                }}>{row.max}</td>
                                                                                <td style={{
                                                                                    padding: '0.8rem 1.25rem',
                                                                                    fontSize: '0.85rem',
                                                                                    color: 'var(--text-secondary)',
                                                                                    textAlign: 'right',
                                                                                    border: 'none'
                                                                                }}>
                                                                                    {row.detail}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}

                                                                    {/* Ligne moyenne calculée */}
                                                                    {(() => {
                                                                        const validNotes = rows
                                                                            .map(r => r.note)
                                                                            .filter(n => n && n.trim() !== "")
                                                                            .map(n => parseFloat(n.replace(',', '.')))
                                                                            .filter(n => !isNaN(n));

                                                                        if (validNotes.length === 0) return null;

                                                                        const studentAvg = (validNotes.reduce((sum, val) => sum + val, 0) / validNotes.length).toFixed(2);

                                                                        return (
                                                                            <tr style={{
                                                                                borderTop: '2px solid var(--primary-color)',
                                                                                background: 'var(--bg-tertiary)'
                                                                            }}>
                                                                                <td style={{
                                                                                    padding: '0.9rem 1.25rem',
                                                                                    fontWeight: '700',
                                                                                    color: 'var(--text-primary)',
                                                                                    fontSize: '0.95rem'
                                                                                }}>
                                                                                    {t('galao.studentAvg')}
                                                                                </td>
                                                                                <td style={{
                                                                                    padding: '0.9rem',
                                                                                    textAlign: 'center',
                                                                                    fontWeight: '800',
                                                                                    fontSize: '1rem',
                                                                                    color: parseFloat(studentAvg) >= 10 ? '#10b981' : '#ef4444'
                                                                                }}>
                                                                                    {studentAvg}
                                                                                </td>
                                                                                <td colSpan="4" style={{
                                                                                    padding: '0.9rem 1.25rem',
                                                                                    color: 'var(--text-muted)',
                                                                                    fontSize: '0.85rem',
                                                                                    fontStyle: 'italic'
                                                                                }}>

                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })()}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}

                                        <div style={{
                                            textAlign: 'center',
                                            marginTop: '2rem',
                                            paddingBottom: '2rem',
                                            color: 'var(--text-muted)',
                                            fontSize: '0.85rem'
                                        }}>
                                            {t('galao.footerCertified')}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{
                                        padding: '4rem 2rem',
                                        textAlign: 'center',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: '16px',
                                        border: '1px solid var(--border-light)'
                                    }}>
                                        <p style={{
                                            color: 'var(--text-secondary)',
                                            fontSize: '1.1rem',
                                            fontWeight: '500'
                                        }}>
                                            {t('galao.noGrades')}
                                        </p>
                                        <p style={{
                                            color: 'var(--text-muted)',
                                            fontSize: '0.9rem',
                                            marginTop: '0.5rem'
                                        }}>
                                            {t('galao.checkRegistration')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}