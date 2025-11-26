"use client";
import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import BackButton from "@/components/BackButton";
import './analytics.css';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#a8edea', '#fed6e3'];

export default function AnalyticsPage() {
    const [data, setData] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTab, setSelectedTab] = useState('overview');
    const [limit, setLimit] = useState(100);
    const [offset, setOffset] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userStats, setUserStats] = useState(null);
    const [loadingUser, setLoadingUser] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [unauthorized, setUnauthorized] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Filtres
    const [filters, setFilters] = useState({
        search: '',
        deviceType: '',
        osName: '',
        browserName: '',
        siteVersion: '',
        dateFrom: '',
        dateTo: '',
        minVisits: '',
        minTime: '',
        statsDays: '30', // Période pour les statistiques (jours)
        excludeLocalhost: true // Exclure localhost par défaut
    });
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');

    // Vérifier l'authentification et le rôle au chargement
    useEffect(() => {
        checkAuth();
    }, []);

    // Charger les données après vérification de l'auth
    useEffect(() => {
        if (authChecked && !unauthorized) {
            fetchAnalytics();
        }
    }, [limit, offset, sortBy, sortOrder, authChecked, unauthorized]);

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/user');

            if (!response.ok) {
                if (response.status === 401) {
                    setIsAuthenticated(false);
                    setUnauthorized(true);
                    setError('Vous devez être connecté pour accéder à cette page.');
                    setTimeout(() => {
                        // Passer la page actuelle comme paramètre de redirection
                        const currentPath = encodeURIComponent(window.location.pathname);
                        window.location.href = `/login?redirect=${currentPath}`;
                    }, 2000);
                } else {
                    setIsAuthenticated(false);
                    setUnauthorized(true);
                    setError('Erreur lors de la vérification de votre session.');
                }
                setAuthChecked(true);
                setLoading(false);
                return;
            }

            const user = await response.json();
            console.log('[Analytics] Données utilisateur reçues:', {
                id: user.id,
                email: user.email,
                role: user.role,
                roleType: typeof user.role,
                roleLength: user.role?.length,
                roleTrimmed: user.role?.trim(),
                fullUser: user
            });

            setIsAuthenticated(true);

            // Normaliser le rôle pour la comparaison (trim + lowercase)
            const normalizedRole = user.role?.trim()?.toLowerCase();
            const expectedRole = 'superadmin';

            // Vérifier le rôle superAdmin (comparaison insensible à la casse)
            if (normalizedRole !== expectedRole) {
                console.warn('[Analytics] Accès refusé - Détails:', {
                    roleReçu: user.role,
                    roleNormalisé: normalizedRole,
                    roleAttendu: expectedRole,
                    correspondance: normalizedRole === expectedRole,
                    userId: user.id,
                    email: user.email
                });
                setUnauthorized(true);
                setError(`Accès refusé : vous devez être un superAdmin pour accéder à cette page. Rôle actuel : "${user.role || 'non défini'}"`);
                setLoading(false);
                setAuthChecked(true);
                return;
            }

            // Utilisateur autorisé
            console.log('[Analytics] Accès autorisé pour:', user.email);
            setAuthChecked(true);
        } catch (err) {
            console.error('[Analytics] Erreur vérification auth:', err);
            setIsAuthenticated(false);
            setUnauthorized(true);
            setError('Erreur lors de la vérification de votre session.');
            setLoading(false);
            setAuthChecked(true);
        }
    };

    const fetchAnalytics = async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString(),
                order_by: sortBy,
                order_direction: sortOrder,
                stats_days: filters.statsDays || '30'
            });

            const response = await fetch(`/api/analytics/data?${params}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 401) {
                    setIsAuthenticated(false);
                    setUnauthorized(true);
                    setError('Vous devez être connecté pour accéder à cette page. Redirection vers la page de connexion...');
                    setTimeout(() => {
                        // Passer la page actuelle comme paramètre de redirection
                        const currentPath = encodeURIComponent(window.location.pathname);
                        window.location.href = `/login?redirect=${currentPath}`;
                    }, 2000);
                } else if (response.status === 403) {
                    setUnauthorized(true);
                    setError('Accès refusé : vous devez être un admin pour accéder à cette page.');
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 3000);
                } else if (response.status === 500) {
                    let errorMsg = errorData.error || "Erreur serveur";
                    if (errorData.details) {
                        errorMsg += ` - ${errorData.details}`;
                    }
                    if (errorData.hint) {
                        errorMsg += `\n\n💡 ${errorData.hint}`;
                    }
                    setError(errorMsg);
                } else {
                    setError(`Erreur ${response.status}: ${errorData.error || 'Erreur lors de la récupération des données.'}`);
                }
                setLoading(false);
                return;
            }

            const result = await response.json();
            setData(result.data || []);
            setStatistics(result.statistics);
            setTotalCount(result.count || 0);
            setLastUpdate(new Date());
        } catch (err) {
            console.error('[Analytics] Erreur:', err);
            setError(`Erreur de connexion au serveur: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserStats = async (sessionId, ipAddress) => {
        setLoadingUser(true);
        try {
            const param = sessionId ? `session_id=${sessionId}` : `ip_address=${ipAddress}`;
            const response = await fetch(`/api/analytics/user?${param}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                setError(`Erreur: ${errorData.error || 'Impossible de récupérer les stats utilisateur'}`);
                setLoadingUser(false);
                return;
            }

            const result = await response.json();
            setUserStats(result);
        } catch (err) {
            console.error('[Analytics] Erreur récupération stats utilisateur:', err);
            setError(`Erreur: ${err.message}`);
        } finally {
            setLoadingUser(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '0s';
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (minutes < 60) return `${minutes}m ${secs}s`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const formatLastUpdate = (date) => {
        if (!date) return '';
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return `Il y a ${diff} seconde${diff > 1 ? 's' : ''}`;
        const minutes = Math.floor(diff / 60);
        if (minutes < 60) return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
        return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    // Filtrer les données
    const filteredData = useMemo(() => {
        let filtered = [...data];

        if (filters.search) {
            const search = filters.search.toLowerCase();
            filtered = filtered.filter(item =>
                item.session_id?.toLowerCase().includes(search) ||
                item.ip_address?.toLowerCase().includes(search) ||
                item.device_name?.toLowerCase().includes(search) ||
                item.os_name?.toLowerCase().includes(search) ||
                item.browser_name?.toLowerCase().includes(search)
            );
        }

        if (filters.deviceType) {
            filtered = filtered.filter(item => item.device_type === filters.deviceType);
        }

        if (filters.osName) {
            filtered = filtered.filter(item => item.os_name === filters.osName);
        }

        if (filters.browserName) {
            filtered = filtered.filter(item => item.browser_name === filters.browserName);
        }

        if (filters.siteVersion) {
            filtered = filtered.filter(item => item.site_version === filters.siteVersion);
        }

        if (filters.dateFrom) {
            filtered = filtered.filter(item => new Date(item.created_at) >= new Date(filters.dateFrom));
        }

        if (filters.dateTo) {
            filtered = filtered.filter(item => new Date(item.created_at) <= new Date(filters.dateTo));
        }

        if (filters.minVisits) {
            filtered = filtered.filter(item => (item.visit_count || 0) >= parseInt(filters.minVisits));
        }

        if (filters.minTime) {
            filtered = filtered.filter(item => (item.avg_time_on_page || item.time_on_page || 0) >= parseInt(filters.minTime));
        }

        // Exclure localhost si le filtre est activé
        if (filters.excludeLocalhost) {
            const localhostIPs = ['::1', '127.0.0.1', 'localhost', '::ffff:127.0.0.1'];
            filtered = filtered.filter(item => !localhostIPs.includes(item.ip_address));
        }

        return filtered;
    }, [data, filters]);

    const handleUserClick = (session) => {
        setSelectedUser(session);
        fetchUserStats(session.session_id, session.ip_address);
        setSelectedTab('user');
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setOffset(0); // Reset pagination
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            deviceType: '',
            osName: '',
            browserName: '',
            siteVersion: '',
            dateFrom: '',
            dateTo: '',
            minVisits: '',
            minTime: ''
        });
        setOffset(0);
    };

    const exportData = () => {
        const csv = [
            ['Session ID', 'IP', 'Device', 'OS', 'Browser', 'Visites', 'Temps moyen', 'Première visite', 'Dernière visite'].join(','),
            ...filteredData.map(item => [
                item.session_id,
                item.ip_address,
                `${item.device_type} ${item.device_name || ''}`,
                `${item.os_name} ${item.os_version || ''}`,
                `${item.browser_name} ${item.browser_version || ''}`,
                item.visit_count || 0,
                formatDuration(Math.round(item.avg_time_on_page || item.time_on_page || 0)),
                formatDate(item.first_visit_at),
                formatDate(item.last_visit_at)
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Afficher le chargement pendant la vérification de l'auth
    if (!authChecked || (loading && data.length === 0 && !unauthorized)) {
        return (
            <div className="analytics-container">
                <div className="analytics-loading">
                    <div className="loading-spinner"></div>
                    <p>{authChecked ? 'Chargement des données analytics...' : 'Vérification des permissions...'}</p>
                </div>
            </div>
        );
    }

    // Afficher l'erreur d'autorisation
    if (unauthorized || (error && (error.includes('Accès refusé') || error.includes('superAdmin')))) {
        const currentPath = encodeURIComponent(window.location.pathname);
        return (
            <div className="analytics-container">
                <div className="analytics-error">
                    <h2>🚫 Accès Refusé</h2>
                    <p className="error-message">{error || 'Vous n\'avez pas les permissions nécessaires pour accéder à cette page.'}</p>
                    <div className="error-actions">
                        <BackButton href="/" label="Retour à l'accueil" title="Retour à l'accueil" />
                        {/* Afficher le bouton "Se connecter" seulement si l'utilisateur n'est pas déjà connecté */}
                        {!isAuthenticated && (
                            <button onClick={() => window.location.href = `/login?redirect=${currentPath}`}>
                                Se connecter
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        const formatError = (err) => {
            return err.split('\n').map((line, idx) => (
                <span key={idx}>
                    {line}
                    {idx < err.split('\n').length - 1 && <br />}
                </span>
            ));
        };

        return (
            <div className="analytics-container">
                <div className="analytics-error">
                    <h2>⚠️ Erreur</h2>
                    <p className="error-message">{formatError(error)}</p>
                    <div className="error-actions">
                        <button onClick={fetchAnalytics}>Réessayer</button>
                        {error.includes('connecté') && !isAuthenticated && (
                            <button onClick={() => {
                                const currentPath = encodeURIComponent(window.location.pathname);
                                window.location.href = `/login?redirect=${currentPath}`;
                            }}>
                                Se connecter
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Préparer les données pour les graphiques
    const deviceChartData = statistics?.deviceTypes?.map(item => ({
        name: item.name.charAt(0).toUpperCase() + item.name.slice(1),
        value: item.count,
        percentage: parseFloat(item.percentage)
    })) || [];

    const osChartData = statistics?.osNames?.slice(0, 8).map(item => ({
        name: item.name,
        value: item.count,
        percentage: parseFloat(item.percentage)
    })) || [];

    const browserChartData = statistics?.browserNames?.slice(0, 8).map(item => ({
        name: item.name,
        value: item.count,
        percentage: parseFloat(item.percentage)
    })) || [];

    const visitsByDayData = statistics?.visitsByDay?.map(item => ({
        date: new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        visites: item.count
    })) || [];

    const visitsByHourData = statistics?.visitsByHour?.map(item => ({
        heure: `${item.hour}h`,
        visites: item.count
    })) || [];

    return (
        <div className="analytics-container">
            <header className="analytics-header">
                <div>
                    <h1>📊 Analytics du Site</h1>
                    <p>Analyse complète des visiteurs et de leur comportement</p>
                    {lastUpdate && (
                        <div className="last-update">
                            <span className="last-update-icon">🔄</span>
                            <span>Dernière mise à jour : {formatLastUpdate(lastUpdate)}</span>
                        </div>
                    )}
                </div>
                <button className="export-btn" onClick={exportData} title="Exporter en CSV">
                    📥 Exporter
                </button>
            </header>

            <div className="analytics-tabs">
                <button
                    className={selectedTab === 'overview' ? 'active' : ''}
                    onClick={() => setSelectedTab('overview')}
                >
                    📈 Vue d'ensemble
                </button>
                <button
                    className={selectedTab === 'sessions' ? 'active' : ''}
                    onClick={() => setSelectedTab('sessions')}
                >
                    👥 Sessions ({totalCount})
                </button>
                <button
                    className={selectedTab === 'devices' ? 'active' : ''}
                    onClick={() => setSelectedTab('devices')}
                >
                    📱 Appareils
                </button>
                <button
                    className={selectedTab === 'versions' ? 'active' : ''}
                    onClick={() => setSelectedTab('versions')}
                >
                    🔄 Versions
                </button>
                {selectedUser && (
                    <button
                        className={selectedTab === 'user' ? 'active' : ''}
                        onClick={() => setSelectedTab('user')}
                    >
                        👤 Utilisateur
                    </button>
                )}
            </div>

            {selectedTab === 'overview' && statistics && (
                <div className="analytics-overview">
                    <div className="stats-grid">
                        <div className="stat-card stat-card-primary">
                            <div className="stat-icon">📊</div>
                            <h3>Total d'enregistrements</h3>
                            <p className="stat-value">{statistics.total.toLocaleString()}</p>
                            <div className="stat-badge">
                                <span>Toutes périodes</span>
                            </div>
                        </div>
                        <div className="stat-card stat-card-success">
                            <div className="stat-icon">👤</div>
                            <h3>Sessions uniques</h3>
                            <p className="stat-value">{statistics.uniqueSessions?.toLocaleString() || 0}</p>
                            {statistics.uniqueSessions && statistics.total > 0 && (
                                <div className="stat-badge">
                                    <span>{Math.round((statistics.uniqueSessions / statistics.total) * 100)}% du total</span>
                                </div>
                            )}
                        </div>
                        <div className="stat-card stat-card-info">
                            <div className="stat-icon">🌐</div>
                            <h3>IPs uniques</h3>
                            <p className="stat-value">{statistics.uniqueIPs?.toLocaleString() || 0}</p>
                            {statistics.uniqueIPs && statistics.uniqueSessions > 0 && (
                                <div className="stat-badge">
                                    <span>{Math.round((statistics.uniqueIPs / statistics.uniqueSessions) * 100)}% des sessions</span>
                                </div>
                            )}
                        </div>
                        <div className="stat-card stat-card-warning">
                            <div className="stat-icon">🔄</div>
                            <h3>Total visites</h3>
                            <p className="stat-value">{statistics.totalVisits?.toLocaleString() || 0}</p>
                            {statistics.totalVisits && statistics.uniqueSessions > 0 && (
                                <div className="stat-badge">
                                    <span>{Math.round(statistics.totalVisits / statistics.uniqueSessions)} visites/session</span>
                                </div>
                            )}
                        </div>
                        <div className="stat-card stat-card-secondary">
                            <div className="stat-icon">⏱️</div>
                            <h3>Temps moyen sur page</h3>
                            <p className="stat-value">{formatDuration(statistics.avgTimeOnPage || 0)}</p>
                            {statistics.avgTimeOnPage && statistics.avgTimeOnPage > 60 && (
                                <div className="stat-badge stat-badge-trend up">
                                    <span>↑ Engagement élevé</span>
                                </div>
                            )}
                        </div>
                        <div className="stat-card stat-card-tertiary">
                            <div className="stat-icon">📈</div>
                            <h3>Visites moyennes/session</h3>
                            <p className="stat-value">{statistics.avgVisitsPerSession || '0'}</p>
                            {statistics.avgVisitsPerSession && parseFloat(statistics.avgVisitsPerSession) > 2 && (
                                <div className="stat-badge stat-badge-trend up">
                                    <span>↑ Bonne rétention</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="charts-grid">
                        <div className="chart-card">
                            <h3>Types d'appareils</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={deviceChartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {deviceChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="chart-card">
                            <h3>Systèmes d'exploitation</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={osChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#667eea" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="chart-card">
                            <h3>Navigateurs</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={browserChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#764ba2" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {visitsByDayData.length > 0 && (
                            <div className="chart-card chart-card-wide">
                                <h3>Visites par jour (30 derniers jours)</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={visitsByDayData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="visites" stroke="#667eea" fill="#667eea" fillOpacity={0.6} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {visitsByHourData.length > 0 && (
                            <div className="chart-card chart-card-wide">
                                <h3>Visites par heure de la journée</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={visitsByHourData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="heure" />
                                        <YAxis />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="visites" stroke="#f093fb" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {selectedTab === 'sessions' && (
                <div className="analytics-sessions">
                    {loading && data.length > 0 && (
                        <div className="loading-overlay">
                            <div className="loading-spinner"></div>
                        </div>
                    )}
                    <div className="filters-panel">
                        <h3>🔍 Filtres</h3>
                        <div className="filters-grid">
                            <input
                                type="text"
                                placeholder="Rechercher (session, IP, device, OS, browser)..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="filter-input"
                                title="Recherche dans les sessions, IPs, appareils, OS et navigateurs"
                            />
                            <select
                                value={filters.deviceType}
                                onChange={(e) => handleFilterChange('deviceType', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">Tous les appareils</option>
                                {statistics?.deviceTypes?.map((item, idx) => (
                                    <option key={idx} value={item.name}>{item.name}</option>
                                ))}
                            </select>
                            <select
                                value={filters.osName}
                                onChange={(e) => handleFilterChange('osName', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">Tous les OS</option>
                                {statistics?.osNames?.map((item, idx) => (
                                    <option key={idx} value={item.name}>{item.name}</option>
                                ))}
                            </select>
                            <select
                                value={filters.browserName}
                                onChange={(e) => handleFilterChange('browserName', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">Tous les navigateurs</option>
                                {statistics?.browserNames?.map((item, idx) => (
                                    <option key={idx} value={item.name}>{item.name}</option>
                                ))}
                            </select>
                            <select
                                value={filters.siteVersion}
                                onChange={(e) => handleFilterChange('siteVersion', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">Toutes les versions</option>
                                {statistics?.siteVersions?.map((item, idx) => (
                                    <option key={idx} value={item.name}>v{item.name}</option>
                                ))}
                            </select>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                className="filter-input"
                                placeholder="Date de début"
                            />
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                className="filter-input"
                                placeholder="Date de fin"
                            />
                            <input
                                type="number"
                                placeholder="Visites min"
                                value={filters.minVisits}
                                onChange={(e) => handleFilterChange('minVisits', e.target.value)}
                                className="filter-input"
                            />
                            <input
                                type="number"
                                placeholder="Temps min (secondes)"
                                value={filters.minTime}
                                onChange={(e) => handleFilterChange('minTime', e.target.value)}
                                className="filter-input"
                            />
                            <label className="filter-label">
                                Période stats (jours):
                                <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={filters.statsDays}
                                    onChange={(e) => handleFilterChange('statsDays', e.target.value)}
                                    className="filter-input"
                                    title="Nombre de jours à analyser pour les statistiques (défaut: 30)"
                                />
                            </label>
                            <label className="filter-checkbox">
                                <input
                                    type="checkbox"
                                    checked={filters.excludeLocalhost}
                                    onChange={(e) => handleFilterChange('excludeLocalhost', e.target.checked)}
                                />
                                <span>Exclure localhost (::1, 127.0.0.1)</span>
                            </label>
                            <button onClick={clearFilters} className="clear-filters-btn">
                                🗑️ Effacer
                            </button>
                        </div>
                        <div className="filter-info">
                            <p>💡 Les statistiques analysent les {filters.statsDays || 30} derniers jours pour optimiser les performances</p>
                        </div>
                    </div>

                    <div className="sessions-controls">
                        <div className="controls-left">
                            <label>
                                Limite:
                                <select value={limit} onChange={(e) => { setLimit(parseInt(e.target.value)); setOffset(0); }}>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={200}>200</option>
                                    <option value={500}>500</option>
                                </select>
                            </label>
                            <label>
                                Trier par:
                                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                    <option value="created_at">Date de création</option>
                                    <option value="last_visit_at">Dernière visite</option>
                                    <option value="visit_count">Nombre de visites</option>
                                    <option value="avg_time_on_page">Temps moyen</option>
                                    <option value="total_time_on_page">Temps total</option>
                                </select>
                            </label>
                            <label>
                                Ordre:
                                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                                    <option value="desc">Décroissant</option>
                                    <option value="asc">Croissant</option>
                                </select>
                            </label>
                            {filteredData.length > 0 && (
                                <div className="stat-badge" style={{ margin: 0 }}>
                                    <span>{filteredData.length} résultat{filteredData.length > 1 ? 's' : ''} affiché{filteredData.length > 1 ? 's' : ''}</span>
                                </div>
                            )}
                        </div>
                        <div className="pagination">
                            <button
                                disabled={offset === 0}
                                onClick={() => setOffset(Math.max(0, offset - limit))}
                                title="Page précédente"
                            >
                                ← Précédent
                            </button>
                            <span>Page {Math.floor(offset / limit) + 1} ({(offset + 1)}-{Math.min(offset + limit, totalCount)} sur {totalCount})</span>
                            <button
                                disabled={offset + limit >= totalCount}
                                onClick={() => setOffset(offset + limit)}
                                title="Page suivante"
                            >
                                Suivant →
                            </button>
                        </div>
                    </div>

                    <div className="sessions-table-container">
                        <table className="sessions-table">
                            <thead>
                                <tr>
                                    <th>Session ID</th>
                                    <th>IP</th>
                                    <th>Appareil</th>
                                    <th>OS</th>
                                    <th>Navigateur</th>
                                    <th>Version Site</th>
                                    <th>Temps</th>
                                    <th>Visites</th>
                                    <th>Première visite</th>
                                    <th>Dernière visite</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((session, idx) => (
                                    <tr
                                        key={idx}
                                        className="session-row"
                                        onClick={() => handleUserClick(session)}
                                        title="Cliquer pour voir les détails de cette session"
                                    >
                                        <td className="session-id" title={session.session_id}>{session.session_id.substring(0, 8)}...</td>
                                        <td title={`Adresse IP: ${session.ip_address || 'N/A'}`}>{session.ip_address || 'N/A'}</td>
                                        <td>
                                            <div className="device-info">
                                                <span className="device-type">{session.device_type || 'unknown'}</span>
                                                {session.device_name && session.device_name !== 'unknown' && (
                                                    <span className="device-name">{session.device_name}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            {session.os_name || 'unknown'}
                                            {session.os_version && ` ${session.os_version}`}
                                        </td>
                                        <td>
                                            {session.browser_name || 'unknown'}
                                            {session.browser_version && ` ${session.browser_version}`}
                                        </td>
                                        <td>{session.site_version || 'unknown'}</td>
                                        <td>
                                            <div className="time-info">
                                                <span className="time-last">{formatDuration(session.time_on_page)}</span>
                                                {session.avg_time_on_page && (
                                                    <span className="time-avg" title="Temps moyen par visite">
                                                        (moy: {formatDuration(Math.round(session.avg_time_on_page))})
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td title={`${session.visit_count || 1} visite${(session.visit_count || 1) > 1 ? 's' : ''}`}>{session.visit_count || 1}</td>
                                        <td title={`Première visite: ${formatDate(session.first_visit_at)}`}>{formatDate(session.first_visit_at)}</td>
                                        <td title={`Dernière visite: ${formatDate(session.last_visit_at)}`}>{formatDate(session.last_visit_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredData.length === 0 && (
                            <div className="no-results">
                                <p>Aucun résultat trouvé avec ces filtres</p>
                                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.7 }}>
                                    Essayez de modifier vos critères de recherche ou de réinitialiser les filtres
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {selectedTab === 'devices' && statistics && (
                <div className="analytics-devices">
                    <div className="charts-grid">
                        <div className="chart-card">
                            <h3>Types d'appareils</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <PieChart>
                                    <Pie
                                        data={deviceChartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                                        outerRadius={120}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {deviceChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="chart-card">
                            <h3>Systèmes d'exploitation</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={osChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="value" fill="#667eea" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {selectedTab === 'versions' && statistics && (
                <div className="analytics-versions">
                    <div className="chart-card">
                        <h3>Versions du site utilisées</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={statistics.siteVersions.map(v => ({ name: `v${v.name}`, value: v.count }))}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" fill="#43e97b" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {selectedTab === 'user' && selectedUser && (
                <div className="analytics-user-detail">
                    <div className="user-detail-header">
                        <BackButton 
                            onClick={() => { setSelectedUser(null); setUserStats(null); setSelectedTab('sessions'); }}
                            label="Retour à la liste"
                            title="Retour à la liste"
                        />
                        <h2>Détails de l'utilisateur</h2>
                    </div>

                    {loadingUser ? (
                        <div className="loading-state">Chargement des statistiques...</div>
                    ) : userStats ? (
                        <div className="user-detail-content">
                            <div className="user-info-card">
                                <h3>Informations de l'appareil</h3>
                                <div className="user-info-grid">
                                    <div className="info-item">
                                        <span className="info-label">Session ID:</span>
                                        <span className="info-value">{userStats.user.session_id}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">IP:</span>
                                        <span className="info-value">{userStats.user.ip_address}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Appareil:</span>
                                        <span className="info-value">{userStats.user.device_name || 'unknown'} ({userStats.user.device_type})</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">OS:</span>
                                        <span className="info-value">{userStats.user.os_name} {userStats.user.os_version}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Navigateur:</span>
                                        <span className="info-value">{userStats.user.browser_name} {userStats.user.browser_version}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Langue:</span>
                                        <span className="info-value">{userStats.user.browser_language}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Résolution:</span>
                                        <span className="info-value">{userStats.user.screen_width}x{userStats.user.screen_height}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Version du site:</span>
                                        <span className="info-value">{userStats.user.site_version || 'unknown'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="user-stats-card">
                                <h3>Statistiques d'utilisation</h3>
                                <div className="stats-grid">
                                    <div className="stat-box">
                                        <div className="stat-box-label">Sessions totales</div>
                                        <div className="stat-box-value">{userStats.statistics.totalSessions}</div>
                                    </div>
                                    <div className="stat-box">
                                        <div className="stat-box-label">Visites totales</div>
                                        <div className="stat-box-value">{userStats.statistics.totalVisits}</div>
                                    </div>
                                    <div className="stat-box">
                                        <div className="stat-box-label">Temps total sur le site</div>
                                        <div className="stat-box-value">{formatDuration(userStats.statistics.totalTimeOnSite)}</div>
                                    </div>
                                    <div className="stat-box">
                                        <div className="stat-box-label">Temps moyen par visite</div>
                                        <div className="stat-box-value">{formatDuration(Math.round(userStats.statistics.avgTimePerVisit))}</div>
                                    </div>
                                    <div className="stat-box">
                                        <div className="stat-box-label">Première visite</div>
                                        <div className="stat-box-value">{formatDate(userStats.statistics.firstVisitAt)}</div>
                                    </div>
                                    <div className="stat-box">
                                        <div className="stat-box-label">Dernière visite</div>
                                        <div className="stat-box-value">{formatDate(userStats.statistics.lastVisitAt)}</div>
                                    </div>
                                    <div className="stat-box">
                                        <div className="stat-box-label">Jours depuis la première visite</div>
                                        <div className="stat-box-value">{userStats.statistics.daysSinceFirstVisit} jours</div>
                                    </div>
                                </div>
                            </div>

                            {userStats.sessions && userStats.sessions.length > 0 && (
                                <div className="user-sessions-list">
                                    <h3>Historique des sessions</h3>
                                    <table className="sessions-table">
                                        <thead>
                                            <tr>
                                                <th>Session ID</th>
                                                <th>Visites</th>
                                                <th>Temps dernière visite</th>
                                                <th>Temps total</th>
                                                <th>Temps moyen</th>
                                                <th>Version site</th>
                                                <th>Dernière visite</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {userStats.sessions.map((s, idx) => (
                                                <tr key={idx}>
                                                    <td className="session-id">{s.session_id.substring(0, 12)}...</td>
                                                    <td>{s.visit_count}</td>
                                                    <td>{formatDuration(s.time_on_page)}</td>
                                                    <td>{formatDuration(s.total_time_on_page || s.time_on_page)}</td>
                                                    <td>{formatDuration(Math.round(s.avg_time_on_page || s.time_on_page))}</td>
                                                    <td>{s.site_version || 'unknown'}</td>
                                                    <td>{formatDate(s.last_visit_at)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="error-state">Aucune donnée disponible</div>
                    )}
                </div>
            )}

            <div className="analytics-footer">
                <button onClick={fetchAnalytics} disabled={loading}>
                    {loading ? '🔄 Actualisation...' : '🔄 Actualiser'}
                </button>
            </div>
        </div>
    );
}
