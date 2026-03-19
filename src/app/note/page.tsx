// @ts-nocheck
import { Suspense } from "react";
import NoteLoginClient from "./NoteLoginClient";
import NoteFallback from "./NoteFallback";

export const metadata = {
    title: "Accès Galao",
    description: "Saisissez vos identifiants Galao (nom d'utilisateur et mot de passe) pour accéder aux fonctionnalités de notes.",
};

export default function NotePage() {
    return (
        <Suspense fallback={<NoteFallback />}>
            <NoteLoginClient />
        </Suspense>
    );
}


