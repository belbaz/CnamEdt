import { Suspense } from "react";
import AbsencesClient from "./AbsencesClient";
import AbsencesFallback from "./AbsencesFallback";

export const metadata = {
    title: "Absences Galao | EDT CNAM",
    description: "Consultez l'historique de vos absences récupéré en temps réel depuis Galao.",
};

export default function AbsencesPage() {
    return (
        <Suspense fallback={<AbsencesFallback />}>
            <AbsencesClient />
        </Suspense>
    );
}

