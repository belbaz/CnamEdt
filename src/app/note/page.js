import { Suspense } from "react";
import NoteLoginClient from "./NoteLoginClient";

export const metadata = {
    title: "Connexion Galao | Notes EDT CNAM",
    description: "Saisissez vos identifiants Galao (nom d'utilisateur et mot de passe) pour accéder aux fonctionnalités de notes.",
};

function NoteLoginFallback() {
    return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
            <p>Chargement de la page de connexion aux notes...</p>
        </div>
    );
}

export default function NotePage() {
    return (
        <Suspense fallback={<NoteLoginFallback />}>
            <NoteLoginClient />
        </Suspense>
    );
}

