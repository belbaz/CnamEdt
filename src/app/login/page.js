export const metadata = {
    title: "Connexion | EDT CNAM",
    description: "Accédez à votre espace utilisateur pour gérer votre emploi du temps EICNAM.",
};

import { Suspense } from "react";
import LoginForm from "./LoginForm";

function LoginFormFallback() {
    return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
            <p>Chargement...</p>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<LoginFormFallback />}>
            <LoginForm />
        </Suspense>
    );
}

