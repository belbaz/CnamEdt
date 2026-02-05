"use client";

import { useEffect, useMemo, useState } from "react";
import BackButton from "@/components/BackButton";
import styles from "../login/login.module.css";

/**
 * Page client pour l'affichage des absences Galao,
 * basée sur la même session (cookies) que les notes.
 */
export default function AbsencesClient() {
    const [html, setHtml] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [absences, setAbsences] = useState([]);
    const [summary, setSummary] = useState({
        totals: "",
        exclusions: "",
        late: "",
    });

    const loadAbsences = async () => {
        try {
            setLoading(true);
            setError("");

            const res = await fetch("/api/galao/absences");
            const data = await res.json();

            if (res.status === 401) {
                setError(data?.error || "Votre session Galao a expiré. Merci de vous reconnecter via la page des notes.");
                setHtml("");
                setAbsences([]);
                return;
            }

            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Impossible de récupérer les absences depuis Galao.");
            }

            const rawHtml = data.html || "";
            if (!rawHtml) {
                setError("Réponse d'absences vide ou invalide.");
                return;
            }

            setHtml(rawHtml);
        } catch (e) {
            console.warn("[Absences] Erreur de chargement", e);
            setError(e?.message || "Erreur inattendue lors du chargement des absences.");
        } finally {
            setLoading(false);
        }
    };

    // Parsing HTML des absences (structure très positionnée, on simplifie)
    useEffect(() => {
        if (!html) {
            setAbsences([]);
            setSummary({ totals: "", exclusions: "", late: "" });
            return;
        }

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            const rows = [];

            // Les blocs d'absence sont représentés par des tables avec id elm_codaX
            const codeBlocks = Array.from(doc.querySelectorAll('table[id^="elm_coda"]'));

            codeBlocks.forEach((table) => {
                const idSuffix = table.id.replace("elm_coda", "");
                const descDiv = table.querySelector("div.txtmapleC8_15C");
                const description = descDiv
                    ? descDiv.textContent.replace(/\s+/g, " ").trim()
                    : "";

                const justDiv = doc.querySelector(
                    `#elm_cona${idSuffix} div.txtmapleC8_15C`,
                );
                const justification = justDiv
                    ? justDiv.textContent.replace(/\s+/g, " ").trim()
                    : "";

                const pjDiv = doc.querySelector(
                    `#elm_copj${idSuffix} div.txtmapleC8_15C`,
                );
                const pj = pjDiv
                    ? pjDiv.textContent.replace(/\s+/g, " ").trim()
                    : "";

                const dateJustDiv = doc.querySelector(
                    `#elm_coor${idSuffix} div.txtmapleC8_15C`,
                );
                const dateJustification = dateJustDiv
                    ? dateJustDiv.textContent.replace(/\s+/g, " ").trim()
                    : "";

                const operateurDiv = doc.querySelector(
                    `#elm_coop${idSuffix} div.txtmapleC8_15C`,
                );
                const operateur = operateurDiv
                    ? operateurDiv.textContent.replace(/\s+/g, " ").trim()
                    : "";

                if (!description) return;

                rows.push({
                    id: idSuffix,
                    description,
                    justification,
                    pj,
                    dateJustification,
                    operateur,
                });
            });

            // Récupérer les textes récapitulatifs en bas de page
            const cleanText = (el) =>
                el ? el.textContent.replace(/\s+/g, " ").trim() : "";

            const totalsDiv = doc.querySelector("#elm_tleg div.txtmaple9_P127C");
            const exclusionsDiv = doc.querySelector("#elm_texc div.txtmaple9_P127C");
            const lateDiv = doc.querySelector("#elm_tret div.txtmaple9_P127C");

            setSummary({
                totals: cleanText(totalsDiv),
                exclusions: cleanText(exclusionsDiv),
                late: cleanText(lateDiv),
            });

            setAbsences(rows);
        } catch (e) {
            console.warn("[Absences] Erreur parsing HTML", e);
            setAbsences([]);
            setSummary({ totals: "", exclusions: "", late: "" });
        }
    }, [html]);

    const totalAbsences = useMemo(() => absences.length, [absences]);

    useEffect(() => {
        // Chargement initial
        loadAbsences();
    }, []);

    return (
        <div className={styles.page}>
            <div className={styles.notePage} style={{ maxWidth: "780px", margin: "0 auto" }}>
                <BackButton href="/" title="Retour à l'emploi du temps" />

                <div className={styles.formCard}>
                    <header className={styles.cardHeader}>
                        <div>
                            <h2>Historique des absences</h2>
                            <p className={styles.cardSubhead}>
                                Données lues en temps réel depuis Galao (lecture seule).
                            </p>
                        </div>
                        {totalAbsences > 0 && (
                            <div
                                style={{
                                    fontSize: "0.8rem",
                                    color: "var(--text-secondary)",
                                    textAlign: "right",
                                }}
                            >
                                <strong>{totalAbsences}</strong>{" "}
                                absence{totalAbsences > 1 ? "s" : ""} trouvée
                                {totalAbsences > 1 ? "s" : ""}.
                            </div>
                        )}
                    </header>

                    {error && <div className={styles.errorBanner}>{error}</div>}

                    {loading && (
                        <div className={styles.loaderContainer}>
                            <div className={styles.modernLoader} />
                            <div className={styles.loaderText}>
                                Chargement des absences Galao...
                            </div>
                        </div>
                    )}

                    {!loading && !error && absences.length === 0 && (
                        <p
                            style={{
                                fontSize: "0.9rem",
                                color: "var(--text-secondary)",
                                marginTop: "0.75rem",
                            }}
                        >
                            Aucune absence n'a été trouvée pour ce dossier Galao.
                        </p>
                    )}

                    {!loading && !error && absences.length > 0 && (
                        <>
                            {(summary.totals || summary.exclusions || summary.late) && (
                                <div
                                    style={{
                                        marginTop: "0.75rem",
                                        marginBottom: "0.25rem",
                                        fontSize: "0.85rem",
                                        color: "var(--text-secondary)",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "0.15rem",
                                    }}
                                >
                                    {summary.totals && <div>{summary.totals}</div>}
                                    {summary.exclusions && <div>{summary.exclusions}</div>}
                                    {summary.late && <div>{summary.late}</div>}
                                </div>
                            )}
                        <div className={styles.notesTableWrapper} style={{ marginTop: "1rem" }}>
                            <table className={styles.notesTable}>
                                <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Justification</th>
                                    <th>P.J.</th>
                                    <th>Date justification</th>
                                    <th>Opérateur</th>
                                </tr>
                                </thead>
                                <tbody>
                                {absences.map((abs, idx) => (
                                    <tr key={abs.id || idx}>
                                        <td
                                            className={styles.notesTableLabel}
                                            style={{ fontSize: "0.85rem" }}
                                        >
                                            {abs.description}
                                        </td>
                                        <td style={{ fontSize: "0.85rem" }}>
                                            {abs.justification || "—"}
                                        </td>
                                        <td style={{ textAlign: "center", fontSize: "0.85rem" }}>
                                            {abs.pj || "—"}
                                        </td>
                                        <td style={{ fontSize: "0.85rem" }}>
                                            {abs.dateJustification || "—"}
                                        </td>
                                        <td style={{ fontSize: "0.85rem" }}>
                                            {abs.operateur || "—"}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

