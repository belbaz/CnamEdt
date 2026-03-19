"use client";
import Spinner from "./Spinner";
import {useI18n} from "@/i18n/I18nContext";
import "./LoadingSpinner.css";

export default function LoadingSpinner() {
    const { t } = useI18n();
    return (
        <div className="loading-container">
            <Spinner size="large" variant="border" />
            <p suppressHydrationWarning>{t('loading.default')}</p>
        </div>
    );
}

