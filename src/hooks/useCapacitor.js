"use client";
import { useState, useEffect } from 'react';

/**
 * Hook pour gérer Capacitor et détecter si on est sur mobile
 */
export function useCapacitor() {
    const [isNative, setIsNative] = useState(false);
    const [capacitorReady, setCapacitorReady] = useState(false);
    const [capacitorModules, setCapacitorModules] = useState({
        Capacitor: null,
        Http: null,
        SplashScreen: null
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const { Capacitor } = require('@capacitor/core');
                const { CapacitorHttp } = require('@capacitor/core');
                const { SplashScreen } = require('@capacitor/splash-screen');
                
                const isNativePlatform = Capacitor && Capacitor.isNativePlatform();
                
                setIsNative(isNativePlatform);
                setCapacitorModules({
                    Capacitor,
                    Http: CapacitorHttp,
                    SplashScreen
                });
                setCapacitorReady(true);
                
                console.log('[Capacitor] Ready - Native:', isNativePlatform);
            } catch (e) {
                console.log('[Capacitor] Non disponible (mode web)');
                setCapacitorReady(true);
            }
        }
    }, []);

    return {
        isNative,
        capacitorReady,
        ...capacitorModules
    };
}

/**
 * Hook pour gérer le splash screen
 */
export function useSplashScreen(SplashScreen, shouldHide) {
    useEffect(() => {
        if (SplashScreen && shouldHide) {
            setTimeout(() => {
                SplashScreen.hide();
            }, 300);
        }
    }, [SplashScreen, shouldHide]);
}
