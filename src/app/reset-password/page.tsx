// @ts-nocheck
import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export const metadata = {
    title: "Réinitialiser mon mot de passe | EDT CNAM",
    description: "Réinitialisez votre mot de passe EICNAM depuis le lien reçu par email.",
};

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="loading">Chargement...</div>}>
            <ResetPasswordClient />
        </Suspense>
    );
}


