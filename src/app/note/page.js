import { Suspense } from "react";
import NoteLoginClient from "./NoteLoginClient";

import LoadingSpinner from "@/components/LoadingSpinner";

export const metadata = {
    title: "Connexion Galao | Notes EDT CNAM",
    description: "Saisissez vos identifiants Galao (nom d'utilisateur et mot de passe) pour accéder aux fonctionnalités de notes.",
};

function NoteLoginFallback() {
    return <LoadingSpinner />;
}

export default function NotePage() {
    return (
        <Suspense fallback={<NoteLoginFallback />}>
            <NoteLoginClient />
        </Suspense>
    );
}

