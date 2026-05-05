"use client";

import { useI18n } from "@/i18n/I18nContext";
import styles from "./PersonalNoteIndicator.module.css";

/** Cadenas plein (différent du contour utilisé ailleurs), couleur via currentColor */
export function PersonalNoteFilledLockIcon({ size = 14 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
        >
            <path
                fill="currentColor"
                d="M17 8h-1V6c0-2.76-2.24-5-5-5S6 3.24 6 6v2H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-7-2c0-1.66 1.34-3 3-3s3 1.34 3 3v2H10V6z"
            />
        </svg>
    );
}

/** Bandeau discret en tête de paragraphe : personnel, visible par vous seul */
export function PersonalNoteIndicatorStrip({ visible }: { visible: boolean }) {
    const { t } = useI18n();
    if (!visible) return null;
    return (
        <div className={styles.strip} role="status">
            <span className={styles.iconWrap}>
                <PersonalNoteFilledLockIcon size={14} />
            </span>
            <span>{t("common.personalNoteBadge")}</span>
        </div>
    );
}

/** Petit cadenas à côté du titre « Note n » en édition */
export function PersonalNoteLockChip({
    visible,
    title,
}: {
    visible: boolean;
    title?: string;
}) {
    if (!visible) return null;
    return (
        <span className={styles.lockChip} title={title} role="img" aria-label={title}>
            <PersonalNoteFilledLockIcon size={13} />
        </span>
    );
}
