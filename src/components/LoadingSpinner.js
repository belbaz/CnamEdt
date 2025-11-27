"use client";
import Spinner from "./Spinner";
import "./LoadingSpinner.css";

export default function LoadingSpinner() {
    return (
        <div className="loading-container">
            <Spinner size="large" variant="border" />
            <p>Chargement...</p>
        </div>
    );
}
