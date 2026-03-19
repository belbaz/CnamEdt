// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import "./Toast.css";

export default function Toast({ message, isVisible, onClose }) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000); // Afficher pendant 3 secondes

            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    return (
        <div className={`toast ${isVisible ? 'toast-show' : ''}`}>
            <div className="toast-content">
                <span className="toast-icon">🎉</span>
                <span className="toast-message">{message}</span>
            </div>
        </div>
    );
}


