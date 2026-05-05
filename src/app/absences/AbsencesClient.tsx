// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import BackButton from "@/components/BackButton";
import styles from "../login/login.module.css";
import KeepAlive from "@/components/KeepAlive";
import { useI18n } from "@/i18n/I18nContext";
import { setGalaoPostLoginRedirect } from "@/lib/galaoPostLoginRedirect";

function redirectGalaoKeepingAbsencesIntent() {
    setGalaoPostLoginRedirect("/absences");
    window.location.replace("/galao");
}

/**
 * Page client pour l'affichage des absences Galao,
 * basée sur la même session (cookies) que les notes.
 */
export default function AbsencesClient() {
    const { t } = useI18n();
    const [html, setHtml] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [absences, setAbsences] = useState([]);
    const [summary, setSummary] = useState({
        totals: "",
        exclusions: "",
        late: "",
    });
    const [backUrl, setBackUrl] = useState("/");

    const loadAbsences = async () => {
        try {
            setLoading(true);
            setError("");

            const res = await fetch("/api/galao/absences");
            const data = await res.json();

            if (res.status === 401 || !res.ok || !data?.success) {
                redirectGalaoKeepingAbsencesIntent();
                return;
            }

            const rawHtml = data.html || "";
            if (!rawHtml) {
                redirectGalaoKeepingAbsencesIntent();
                return;
            }

            setHtml(rawHtml);
        } catch (e) {
            console.warn("[Absences] Erreur de chargement, redirection vers /galao", e);
            redirectGalaoKeepingAbsencesIntent();
            return;
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
        // Vérifier si on vient de /galao
        if (typeof sessionStorage !== "undefined") {
            const fromGalao = sessionStorage.getItem("from_galao");
            if (fromGalao === "true") {
                setBackUrl("/galao");
            }
        }
        
        // Vérifier s'il y a une session Galao active
        if (typeof document !== "undefined") {
            const hasClientFlag = document.cookie.split(";").some((c) =>
                c.trim().startsWith("galao_client="),
            );
            
            if (!hasClientFlag) {
                setGalaoPostLoginRedirect("/absences");
                window.location.replace("/galao");
                return;
            }
        }
        
        // Chargement initial
        loadAbsences();
    }, []);

    return (
        <div className={styles.page}>
            {/* KeepAlive pour maintenir la session Galao active */}
            {!loading && !error && absences.length > 0 && <KeepAlive />}
            
            <div className={styles.notePage} style={{ maxWidth: "780px", margin: "0 auto" }}>
                <BackButton 
                    href={backUrl} 
                    title={backUrl === "/galao" ? t('galao.absences.backToGalao') : t('galao.absences.back')} 
                />

                <div className={styles.formCard}>
                    <header className={styles.cardHeader}>
                        <div>
                            <h2>{t('galao.absences.title')}</h2>
                            <p className={styles.cardSubhead}>
                                {t('galao.absences.subtitle')}
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
                                {totalAbsences > 1 ? t('galao.absences.countPlural') : t('galao.absences.count')}{" "}
                                {totalAbsences > 1 ? t('galao.absences.foundPlural') : t('galao.absences.found')}.
                            </div>
                        )}
                    </header>

                    {error && <div className={styles.errorBanner}>{error}</div>}

                    {loading && (
                        <div className={styles.loaderContainer}>
                            <div className={styles.modernLoader} />
                            <div className={styles.loaderText}>
                                {t('galao.absences.loading')}
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
                            {t('galao.absences.noAbsences')}
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
                            <table className={`${styles.notesTable} ${styles.absencesTable}`}>
                                <thead>
                                <tr>
                                    <th>{t('galao.absences.table.description')}</th>
                                    <th>{t('galao.absences.table.justification')}</th>
                                    <th style={{ textAlign: "center" }}>{t('galao.absences.table.pj')}</th>
                                    <th>{t('galao.absences.table.dateJustification')}</th>
                                    <th>{t('galao.absences.table.operator')}</th>
                                </tr>
                                </thead>
                                <tbody>
                                {absences.map((abs, idx) => (
                                    <tr key={abs.id || idx}>
                                        <td
                                            className={styles.notesTableLabel}
                                            style={{ fontSize: "0.85rem", padding: "0.7rem 0.6rem" }}
                                        >
                                            {abs.description}
                                        </td>
                                        <td style={{ fontSize: "0.85rem", padding: "0.7rem 0.6rem" }}>
                                            {abs.justification || "—"}
                                        </td>
                                        <td style={{ textAlign: "center", fontSize: "0.85rem", padding: "0.7rem 0.6rem" }}>
                                            {abs.pj || "—"}
                                        </td>
                                        <td style={{ fontSize: "0.85rem", padding: "0.7rem 0.6rem" }}>
                                            {abs.dateJustification || "—"}
                                        </td>
                                        <td style={{ fontSize: "0.85rem", padding: "0.7rem 0.6rem" }}>
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


