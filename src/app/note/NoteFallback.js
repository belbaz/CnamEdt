"use client";

import { useI18n } from "@/i18n/I18nContext";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function NoteFallback() {
    const { t } = useI18n();
    return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ marginBottom: "1rem" }}>{t("galao.notes.loading")}</p>
            <LoadingSpinner />
        </div>
    );
}
