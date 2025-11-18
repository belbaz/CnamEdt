import { Suspense } from "react";
import ActiveAccountClient from "./ActiveAccountClient";

export const metadata = {
    title: "Activer mon compte | EDT CNAM",
    description: "Validez votre compte EICNAM depuis le lien reçu par email.",
};

export default function ActiveAccountPage() {
    return (
        <Suspense fallback={<div className="loading">Chargement...</div>}>
            <ActiveAccountClient />
        </Suspense>
    );
}
