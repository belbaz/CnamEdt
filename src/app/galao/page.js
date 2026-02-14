import { Suspense } from "react";
import GalaoClient from "./GalaoClient";
import GalaoFallback from "./GalaoFallback";

export const metadata = {
    title: "Portail Galao | EDT CNAM",
    description:
        "Connectez-vous à Galao puis consultez vos notes ou vos absences à partir d'une seule page.",
};

export default function GalaoPage() {
    return (
        <Suspense fallback={<GalaoFallback />}>
            <GalaoClient />
        </Suspense>
    );
}

