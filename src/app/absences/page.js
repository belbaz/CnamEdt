import { Suspense } from "react";
import AbsencesClient from "./AbsencesClient";

export const metadata = {
    title: "Absences Galao | EDT CNAM",
    description: "Consultez l'historique de vos absences récupéré en temps réel depuis Galao.",
};

function AbsencesFallback() {
    return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
            <p>Chargement de la fiche des absences Galao...</p>
        </div>
    );
}

export default function AbsencesPage() {
    return (
        <Suspense fallback={<AbsencesFallback />}>
            <AbsencesClient />
        </Suspense>
    );
}

