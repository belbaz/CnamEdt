import { Suspense } from "react";
import GalaoClient from "./GalaoClient";

export const metadata = {
    title: "Portail Galao | EDT CNAM",
    description:
        "Connectez-vous à Galao puis consultez vos notes ou vos absences à partir d'une seule page.",
};

function GalaoFallback() {
    return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
            <p>Chargement du portail Galao...</p>
        </div>
    );
}

export default function GalaoPage() {
    return (
        <Suspense fallback={<GalaoFallback />}>
            <GalaoClient />
        </Suspense>
    );
}

