"use client";
import { useState, useEffect } from "react";
import styles from "./page.module.css";

export default function WidgetPage() {
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadNextCourse = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const res = await fetch("/api/next-course", { 
                cache: "no-store" 
            });

            if (!res.ok) {
                throw new Error("Erreur lors de la récupération du cours");
            }

            const data = await res.json();
            
            if (data.hasCourse) {
                setCourse(data.course);
            } else {
                setCourse(null);
            }
        } catch (err) {
            console.error("[Widget] Erreur:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNextCourse();
        
        // Rafraîchir toutes les minutes
        const interval = setInterval(loadNextCourse, 60000);
        
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Chargement...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    <p>Erreur : {error}</p>
                    <button onClick={loadNextCourse} className={styles.retryButton}>
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className={styles.container}>
                <div className={styles.noCourse}>
                    <h2>Aucun cours à venir</h2>
                    <p>Vous n'avez pas de cours programmé.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.widget}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Prochain cours</h1>
                    <div className={styles.date}>{course.date}</div>
                </div>
                
                <div className={styles.content}>
                    <div className={styles.matiere}>{course.matiere}</div>
                    
                    <div className={styles.details}>
                        <div className={styles.detailItem}>
                            <span className={styles.label}>Professeur :</span>
                            <span className={styles.value}>{course.prof}</span>
                        </div>
                        
                        <div className={styles.detailItem}>
                            <span className={styles.label}>Salle :</span>
                            <span className={styles.value}>{course.location}</span>
                        </div>
                        
                        <div className={styles.detailItem}>
                            <span className={styles.label}>Heure :</span>
                            <span className={styles.value}>
                                {course.startTime} - {course.endTime}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

