"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import {useI18n} from "@/i18n/I18nContext";
import BackButton from "@/components/BackButton";
import Spinner from "@/components/Spinner";
import './analytics.css';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#a8edea', '#fed6e3'];

export default function AnalyticsPage() {
    const { t } = useI18n();
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
    const emailFilterDebounceRef = useRef(null);

    // Filtres
    const [filters, setFilters] = useState({
        search: '',
        email: '', // Filtre par email
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

    // Charger les données après vérification de l'auth (pour limit, offset, sortBy, sortOrder)
    useEffect(() => {
        if (authChecked && !unauthorized) {
            fetchAnalytics();
        }
    }, [limit, offset, sortBy, sortOrder, authChecked, unauthorized]);

    // OPTIMISATION: Debounce pour le filtre email pour éviter trop d'appels API
    useEffect(() => {
        if (authChecked && !unauthorized) {
            // Si le filtre email change, attendre 500ms avant de recharger (debounce)
            if (emailFilterDebounceRef.current) {
                clearTimeout(emailFilterDebounceRef.current);
            }
            
            const timeout = setTimeout(() => {
                fetchAnalytics();
            }, 500); // Debounce de 500ms pour le filtre email
            
            emailFilterDebounceRef.current = timeout;
            
            return () => {
                if (emailFilterDebounceRef.current) {
                    clearTimeout(emailFilterDebounceRef.current);
                }
            };
        }
    }, [filters.email, authChecked, unauthorized]);

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/user');

            if (!response.ok) {
                if (response.status === 401) {
                    setIsAuthenticated(false);
                    setUnauthorized(true);
                    setError(t('admin.analytics.mustBeConnected'));
                    setTimeout(() => {
                        // Passer la page actuelle comme paramètre de redirection
                        const currentPath = encodeURIComponent(window.location.pathname);
                        window.location.href = `/login?redirect=${currentPath}`;
                    }, 2000);
                } else {
                    setIsAuthenticated(false);
                    setUnauthorized(true);
                    setError(t('admin.analytics.errorSession'));
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
                setError(t('admin.analytics.accessDeniedMessage').replace('{role}', user.role || 'non défini'));
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

            // Ajouter le filtre par email si fourni (côté serveur pour optimiser)
            if (filters.email && filters.email.trim()) {
                params.append('filter_email', filters.email.trim());
            }

            const response = await fetch(`/api/analytics/data?${params}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 401) {
                    setIsAuthenticated(false);
                    setUnauthorized(true);
                    setError(t('admin.analytics.mustBeConnectedRedirect'));
                    setTimeout(() => {
                        // Passer la page actuelle comme paramètre de redirection
                        const currentPath = encodeURIComponent(window.location.pathname);
                        window.location.href = `/login?redirect=${currentPath}`;
                    }, 2000);
                } else if (response.status === 403) {
                    setUnauthorized(true);
                    setError(t('admin.analytics.accessDeniedMessage').replace('{role}', 'non défini'));
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 3000);
                } else if (response.status === 500) {
                    let errorMsg = errorData.error || t('admin.analytics.errorServer');
                    if (errorData.details) {
                        errorMsg += ` - ${errorData.details}`;
                    }
                    if (errorData.hint) {
                        errorMsg += `\n\n💡 ${errorData.hint}`;
                    }
                    setError(errorMsg);
                } else {
                    setError(`Erreur ${response.status}: ${errorData.error || t('admin.analytics.errorFetchData')}`);
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
            setError(t('admin.analytics.errorConnection').replace('{message}', err.message));
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
                setError(`${t('admin.analytics.error')}: ${errorData.error || t('admin.analytics.errorFetchUserStats')}`);
                setLoadingUser(false);
                return;
            }

            const result = await response.json();
            setUserStats(result);
        } catch (err) {
            console.error('[Analytics] Erreur récupération stats utilisateur:', err);
            setError(`${t('admin.analytics.error')}: ${err.message}`);
        } finally {
            setLoadingUser(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return t('admin.analytics.na');
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
        if (diff < 60) return t('admin.analytics.agoSeconds').replace('{seconds}', diff).replace('{plural}', diff > 1 ? 's' : '');
        const minutes = Math.floor(diff / 60);
        if (minutes < 60) return t('admin.analytics.agoMinutes').replace('{minutes}', minutes).replace('{plural}', minutes > 1 ? 's' : '');
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return t('admin.analytics.agoHours').replace('{hours}', hours).replace('{plural}', hours > 1 ? 's' : '');
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
                item.user_email?.toLowerCase().includes(search) ||
                item.user_id?.toLowerCase().includes(search) ||
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
            email: '',
            deviceType: '',
            osName: '',
            browserName: '',
            siteVersion: '',
            dateFrom: '',
            dateTo: '',
            minVisits: '',
            minTime: '',
            statsDays: '30',
            excludeLocalhost: true
        });
        setOffset(0);
    };

    const exportData = () => {
        const csv = [
            [
                t('admin.analytics.tableSessionId'),
                t('admin.analytics.tableIP'),
                t('admin.analytics.tableUser') || 'Utilisateur',
                'Nom',
                'Email',
                t('admin.analytics.tableDevice'),
                t('admin.analytics.tableOS'),
                t('admin.analytics.tableBrowser'),
                t('admin.analytics.tableVisits'),
                t('admin.analytics.sortAvgTime'),
                t('admin.analytics.tableFirstVisit'),
                t('admin.analytics.tableLastVisit')
            ].join(','),
            ...filteredData.map(item => [
                item.session_id,
                item.ip_address,
                item.user_name || 'Anonyme',
                item.user_name || '',
                item.user_email || '',
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
                    <Spinner size="large" variant="border" />
                    <p>{authChecked ? t('admin.analytics.loadingData') : t('admin.analytics.checkingPermissions')}</p>
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
                    <h2>🚫 {t('admin.analytics.accessDenied')}</h2>
                    <p className="error-message">{error || t('admin.analytics.noPermissions')}</p>
                    <div className="error-actions">
                        <BackButton href="/dashboard" label={t('admin.analytics.backToDashboard')} title={t('admin.analytics.backToDashboard')} />
                        {/* Afficher le bouton "Se connecter" seulement si l'utilisateur n'est pas déjà connecté */}
                        {!isAuthenticated && (
                            <button onClick={() => window.location.href = `/login?redirect=${currentPath}`}>
                                {t('admin.analytics.seConnecter')}
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
                    <h2>⚠️ {t('admin.analytics.error')}</h2>
                    <p className="error-message">{formatError(error)}</p>
                    <div className="error-actions">
                        <button onClick={fetchAnalytics}>{t('admin.analytics.reessayer')}</button>
                        {error.includes('connecté') && !isAuthenticated && (
                            <button onClick={() => {
                                const currentPath = encodeURIComponent(window.location.pathname);
                                window.location.href = `/login?redirect=${currentPath}`;
                            }}>
                                {t('admin.analytics.seConnecter')}
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
            <div className="analytics-back-button">
                <BackButton href="/dashboard" title={t('admin.analytics.backToDashboard')} />
            </div>
            <header className="analytics-header">
                <div>
                    <h1>📊 {t('admin.analytics.title')}</h1>
                    <p>{t('admin.analytics.subtitle')}</p>
                    {lastUpdate && (
                        <div className="last-update">
                            <span className="last-update-icon">🔄</span>
                            <span>{t('admin.analytics.lastUpdate')} {formatLastUpdate(lastUpdate)}</span>
                        </div>
                    )}
                </div>
                <button className="export-btn" onClick={exportData} title={t('admin.analytics.exportCSV')}>
                    📥 {t('admin.analytics.export')}
                </button>
            </header>

            <div className="analytics-tabs">
                <button
                    className={selectedTab === 'overview' ? 'active' : ''}
                    onClick={() => setSelectedTab('overview')}
                >
                    📈 {t('admin.analytics.tabOverview')}
                </button>
                <button
                    className={selectedTab === 'sessions' ? 'active' : ''}
                    onClick={() => setSelectedTab('sessions')}
                >
                    👥 {t('admin.analytics.tabSessions')} ({totalCount})
                </button>
                <button
                    className={selectedTab === 'devices' ? 'active' : ''}
                    onClick={() => setSelectedTab('devices')}
                >
                    📱 {t('admin.analytics.tabDevices')}
                </button>
                <button
                    className={selectedTab === 'versions' ? 'active' : ''}
                    onClick={() => setSelectedTab('versions')}
                >
                    🔄 {t('admin.analytics.tabVersions')}
                </button>
                {selectedUser && (
                    <button
                        className={selectedTab === 'user' ? 'active' : ''}
                        onClick={() => setSelectedTab('user')}
                    >
                        👤 {t('admin.analytics.tabUser')}
                    </button>
                )}
            </div>

            {selectedTab === 'overview' && statistics && (
                <div className="analytics-overview">
                    <div className="stats-grid">
                        <div className="stat-card stat-card-primary">
                            <div className="stat-icon">📊</div>
                            <h3>{t('admin.analytics.statTotalRecords')}</h3>
                            <p className="stat-value">{statistics.total.toLocaleString()}</p>
                            <div className="stat-badge">
                                <span>{t('admin.analytics.statAllPeriods')}</span>
                            </div>
                        </div>
                        <div className="stat-card stat-card-success">
                            <div className="stat-icon">👤</div>
                            <h3>{t('admin.analytics.statUniqueSessions')}</h3>
                            <p className="stat-value">{statistics.uniqueSessions?.toLocaleString() || 0}</p>
                            {statistics.uniqueSessions && statistics.total > 0 && (
                                <div className="stat-badge">
                                    <span>{t('admin.analytics.statPercentOfTotal').replace('{percent}', Math.round((statistics.uniqueSessions / statistics.total) * 100))}</span>
                                </div>
                            )}
                        </div>
                        <div className="stat-card stat-card-info">
                            <div className="stat-icon">🌐</div>
                            <h3>{t('admin.analytics.statUniqueIPs')}</h3>
                            <p className="stat-value">{statistics.uniqueIPs?.toLocaleString() || 0}</p>
                            {statistics.uniqueIPs && statistics.uniqueSessions > 0 && (
                                <div className="stat-badge">
                                    <span>{t('admin.analytics.statPercentOfSessions').replace('{percent}', Math.round((statistics.uniqueIPs / statistics.uniqueSessions) * 100))}</span>
                                </div>
                            )}
                        </div>
                        <div className="stat-card stat-card-warning">
                            <div className="stat-icon">🔄</div>
                            <h3>{t('admin.analytics.statTotalVisits')}</h3>
                            <p className="stat-value">{statistics.totalVisits?.toLocaleString() || 0}</p>
                            {statistics.totalVisits && statistics.uniqueSessions > 0 && (
                                <div className="stat-badge">
                                    <span>{t('admin.analytics.statVisitsPerSession').replace('{visits}', Math.round(statistics.totalVisits / statistics.uniqueSessions))}</span>
                                </div>
                            )}
                        </div>
                        <div className="stat-card stat-card-secondary">
                            <div className="stat-icon">⏱️</div>
                            <h3>{t('admin.analytics.statAvgTimeOnPage')}</h3>
                            <p className="stat-value">{formatDuration(statistics.avgTimeOnPage || 0)}</p>
                            {statistics.avgTimeOnPage && statistics.avgTimeOnPage > 60 && (
                                <div className="stat-badge stat-badge-trend up">
                                    <span>{t('admin.analytics.statHighEngagement')}</span>
                                </div>
                            )}
                        </div>
                        <div className="stat-card stat-card-tertiary">
                            <div className="stat-icon">📈</div>
                            <h3>{t('admin.analytics.statAvgVisitsPerSession')}</h3>
                            <p className="stat-value">{statistics.avgVisitsPerSession || '0'}</p>
                            {statistics.avgVisitsPerSession && parseFloat(statistics.avgVisitsPerSession) > 2 && (
                                <div className="stat-badge stat-badge-trend up">
                                    <span>{t('admin.analytics.statGoodRetention')}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="charts-grid">
                        <div className="chart-card">
                            <h3>{t('admin.analytics.chartDeviceTypes')}</h3>
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
                            <h3>{t('admin.analytics.chartOperatingSystems')}</h3>
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
                            <h3>{t('admin.analytics.chartBrowsers')}</h3>
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
                                <h3>{t('admin.analytics.chartVisitsByDay')}</h3>
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
                                <h3>{t('admin.analytics.chartVisitsByHour')}</h3>
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
                            <Spinner size="large" variant="border" />
                        </div>
                    )}
                    <div className="filters-panel">
                        <h3>🔍 {t('admin.analytics.filtersTitle')}</h3>
                        <div className="filters-grid">
                            <input
                                type="text"
                                placeholder={t('admin.analytics.searchPlaceholder')}
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="filter-input"
                                title={t('admin.analytics.searchTooltip')}
                            />
                            <input
                                type="text"
                                placeholder="Filtrer par email..."
                                value={filters.email}
                                onChange={(e) => handleFilterChange('email', e.target.value)}
                                className="filter-input"
                                title="Filtrer les sessions par email utilisateur"
                            />
                            <select
                                value={filters.deviceType}
                                onChange={(e) => handleFilterChange('deviceType', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">{t('admin.analytics.allDevices')}</option>
                                {statistics?.deviceTypes?.map((item, idx) => (
                                    <option key={idx} value={item.name}>{item.name}</option>
                                ))}
                            </select>
                            <select
                                value={filters.osName}
                                onChange={(e) => handleFilterChange('osName', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">{t('admin.analytics.allOS')}</option>
                                {statistics?.osNames?.map((item, idx) => (
                                    <option key={idx} value={item.name}>{item.name}</option>
                                ))}
                            </select>
                            <select
                                value={filters.browserName}
                                onChange={(e) => handleFilterChange('browserName', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">{t('admin.analytics.allBrowsers')}</option>
                                {statistics?.browserNames?.map((item, idx) => (
                                    <option key={idx} value={item.name}>{item.name}</option>
                                ))}
                            </select>
                            <select
                                value={filters.siteVersion}
                                onChange={(e) => handleFilterChange('siteVersion', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">{t('admin.analytics.allVersions')}</option>
                                {statistics?.siteVersions?.map((item, idx) => (
                                    <option key={idx} value={item.name}>v{item.name}</option>
                                ))}
                            </select>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                className="filter-input"
                                placeholder={t('admin.analytics.dateFrom')}
                            />
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                className="filter-input"
                                placeholder={t('admin.analytics.dateTo')}
                            />
                            <input
                                type="number"
                                placeholder={t('admin.analytics.minVisits')}
                                value={filters.minVisits}
                                onChange={(e) => handleFilterChange('minVisits', e.target.value)}
                                className="filter-input"
                            />
                            <input
                                type="number"
                                placeholder={t('admin.analytics.minTime')}
                                value={filters.minTime}
                                onChange={(e) => handleFilterChange('minTime', e.target.value)}
                                className="filter-input"
                            />
                            <label className="filter-label">
                                {t('admin.analytics.statsPeriodDays')}
                                <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={filters.statsDays}
                                    onChange={(e) => handleFilterChange('statsDays', e.target.value)}
                                    className="filter-input"
                                    title={t('admin.analytics.statsPeriodTooltip')}
                                />
                            </label>
                            <label className="filter-checkbox">
                                <input
                                    type="checkbox"
                                    checked={filters.excludeLocalhost}
                                    onChange={(e) => handleFilterChange('excludeLocalhost', e.target.checked)}
                                />
                                <span>{t('admin.analytics.excludeLocalhost')}</span>
                            </label>
                            <button onClick={clearFilters} className="clear-filters-btn">
                                🗑️ {t('admin.analytics.clearFilters')}
                            </button>
                        </div>
                        <div className="filter-info">
                            <p>{t('admin.analytics.filterInfo').replace('{days}', filters.statsDays || 30)}</p>
                        </div>
                    </div>

                    <div className="sessions-controls">
                        <div className="controls-left">
                            <label>
                                {t('admin.analytics.limit')}
                                <select value={limit} onChange={(e) => { setLimit(parseInt(e.target.value)); setOffset(0); }}>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={200}>200</option>
                                    <option value={500}>500</option>
                                </select>
                            </label>
                            <label>
                                {t('admin.analytics.sortBy')}
                                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                    <option value="created_at">{t('admin.analytics.sortCreatedAt')}</option>
                                    <option value="last_visit_at">{t('admin.analytics.sortLastVisit')}</option>
                                    <option value="visit_count">{t('admin.analytics.sortVisitCount')}</option>
                                    <option value="avg_time_on_page">{t('admin.analytics.sortAvgTime')}</option>
                                    <option value="total_time_on_page">{t('admin.analytics.sortTotalTime')}</option>
                                </select>
                            </label>
                            <label>
                                {t('admin.analytics.order')}
                                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                                    <option value="desc">{t('admin.analytics.orderDesc')}</option>
                                    <option value="asc">{t('admin.analytics.orderAsc')}</option>
                                </select>
                            </label>
                            {filteredData.length > 0 && (
                                <div className="stat-badge" style={{ margin: 0 }}>
                                    <span>{t('admin.analytics.resultsShown')
                                        .replace('{count}', filteredData.length)
                                        .replace(/{plural}/g, filteredData.length > 1 ? 's' : '')}</span>
                                </div>
                            )}
                        </div>
                        <div className="pagination">
                            <button
                                disabled={offset === 0}
                                onClick={() => setOffset(Math.max(0, offset - limit))}
                                title={t('admin.analytics.previous')}
                            >
                                ← {t('admin.analytics.previous')}
                            </button>
                            <span>{t('admin.analytics.pageInfo')
                                .replace('{page}', Math.floor(offset / limit) + 1)
                                .replace('{from}', offset + 1)
                                .replace('{to}', Math.min(offset + limit, totalCount))
                                .replace('{total}', totalCount)}</span>
                            <button
                                disabled={offset + limit >= totalCount}
                                onClick={() => setOffset(offset + limit)}
                                title={t('admin.analytics.next')}
                            >
                                {t('admin.analytics.next')} →
                            </button>
                        </div>
                    </div>

                    <div className="sessions-table-container">
                        <table className="sessions-table">
                            <thead>
                                <tr>
                                    <th>{t('admin.analytics.tableSessionId')}</th>
                                    <th>{t('admin.analytics.tableIP')}</th>
                                    <th>{t('admin.analytics.tableUser') || 'Utilisateur'}</th>
                                    <th>{t('admin.analytics.tableDevice')}</th>
                                    <th>{t('admin.analytics.tableOS')}</th>
                                    <th>{t('admin.analytics.tableBrowser')}</th>
                                    <th>{t('admin.analytics.tableSiteVersion')}</th>
                                    <th>{t('admin.analytics.tableTime')}</th>
                                    <th>{t('admin.analytics.tableVisits')}</th>
                                    <th>{t('admin.analytics.tableFirstVisit')}</th>
                                    <th>{t('admin.analytics.tableLastVisit')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((session, idx) => (
                                    <tr
                                        key={idx}
                                        className="session-row"
                                        onClick={() => handleUserClick(session)}
                                        title={t('admin.analytics.tableClickForDetails')}
                                    >
                                        <td className="session-id" title={session.session_id}>{session.session_id.substring(0, 8)}...</td>
                                        <td title={`Adresse IP: ${session.ip_address || 'N/A'}`}>{session.ip_address || 'N/A'}</td>
                                        <td title={session.user_email ? `Email: ${session.user_email}${session.user_id ? `\nID: ${session.user_id}` : ''}${session.user_name ? `\nNom: ${session.user_name}` : ''}` : 'Visiteur anonyme'}>
                                            {session.user_email ? (
                                                <div className="user-info">
                                                    {session.user_name ? (
                                                        <>
                                                            <span className="user-name" title={`${session.user_first_name || ''} ${session.user_last_name || ''}`.trim()}>
                                                                {session.user_name}
                                                            </span>
                                                            <span className="user-email" title={`Email: ${session.user_email}`}>
                                                                ({session.user_email})
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="user-email">{session.user_email}</span>
                                                    )}
                                                    {session.user_id && (
                                                        <span className="user-id" title={`User ID: ${session.user_id}`}>
                                                            ID: {session.user_id.substring(0, 8)}...
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="anonymous-user">Anonyme</span>
                                            )}
                                        </td>
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
                                                    <span className="time-avg" title={t('admin.analytics.tableAvgTimeTooltip')}>
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
                                <p>{t('admin.analytics.noResults')}</p>
                                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.7 }}>
                                    {t('admin.analytics.noResultsHint')}
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
                            <h3>{t('admin.analytics.chartDeviceTypes')}</h3>
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
                            <h3>{t('admin.analytics.chartOperatingSystems')}</h3>
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
                        <h3>{t('admin.analytics.chartSiteVersions')}</h3>
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
                            label={t('admin.analytics.backToList')}
                            title={t('admin.analytics.backToList')}
                        />
                        <h2>{t('admin.analytics.userDetailTitle')}</h2>
                    </div>

                    {loadingUser ? (
                        <div className="loading-state">{t('admin.analytics.loadingUserStats')}</div>
                    ) : userStats ? (
                        <div className="user-detail-content">
                            <div className="user-info-card">
                                <h3>{t('admin.analytics.userDeviceInfo')}</h3>
                                <div className="user-info-grid">
                                    {userStats.user.user_name && (
                                        <div className="info-item">
                                            <span className="info-label">Nom complet</span>
                                            <span className="info-value">{userStats.user.user_name}</span>
                                        </div>
                                    )}
                                    {userStats.user.user_first_name && (
                                        <div className="info-item">
                                            <span className="info-label">Prénom</span>
                                            <span className="info-value">{userStats.user.user_first_name}</span>
                                        </div>
                                    )}
                                    {userStats.user.user_last_name && (
                                        <div className="info-item">
                                            <span className="info-label">Nom</span>
                                            <span className="info-value">{userStats.user.user_last_name}</span>
                                        </div>
                                    )}
                                    {userStats.user.user_email && (
                                        <div className="info-item">
                                            <span className="info-label">Email utilisateur</span>
                                            <span className="info-value">{userStats.user.user_email}</span>
                                        </div>
                                    )}
                                    {userStats.user.user_id && (
                                        <div className="info-item">
                                            <span className="info-label">ID utilisateur</span>
                                            <span className="info-value">{userStats.user.user_id}</span>
                                        </div>
                                    )}
                                    <div className="info-item">
                                        <span className="info-label">{t('admin.analytics.labelSessionId')}</span>
                                        <span className="info-value">{userStats.user.session_id}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">{t('admin.analytics.labelIP')}</span>
                                        <span className="info-value">{userStats.user.ip_address}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">{t('admin.analytics.labelDevice')}</span>
                                        <span className="info-value">{userStats.user.device_name || 'unknown'} ({userStats.user.device_type})</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">{t('admin.analytics.labelOS')}</span>
                                        <span className="info-value">{userStats.user.os_name} {userStats.user.os_version}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">{t('admin.analytics.labelBrowser')}</span>
                                        <span className="info-value">{userStats.user.browser_name} {userStats.user.browser_version}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">{t('admin.analytics.labelLanguage')}</span>
                                        <span className="info-value">{userStats.user.browser_language}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">{t('admin.analytics.labelResolution')}</span>
                                        <span className="info-value">{userStats.user.screen_width}x{userStats.user.screen_height}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">{t('admin.analytics.labelSiteVersion')}</span>
                                        <span className="info-value">{userStats.user.site_version || 'unknown'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="user-stats-card">
                                <h3>{t('admin.analytics.userStats')}</h3>
                                <div className="stats-grid">
                                    <div className="stat-box">
                                        <div className="stat-box-label">{t('admin.analytics.statTotalSessions')}</div>
                                        <div className="stat-box-value">{userStats.statistics.totalSessions}</div>
                                    </div>
                                    <div className="stat-box">
                                        <div className="stat-box-label">{t('admin.analytics.statTotalVisits')}</div>
                                        <div className="stat-box-value">{userStats.statistics.totalVisits}</div>
                                    </div>
                                    <div className="stat-box">
                                        <div className="stat-box-label">{t('admin.analytics.statTotalTimeOnSite')}</div>
                                        <div className="stat-box-value">{formatDuration(userStats.statistics.totalTimeOnSite)}</div>
                                    </div>
                                    <div className="stat-box">
                                        <div className="stat-box-label">{t('admin.analytics.statAvgTimePerVisit')}</div>
                                        <div className="stat-box-value">{formatDuration(Math.round(userStats.statistics.avgTimePerVisit))}</div>
                                    </div>
                                    <div className="stat-box">
                                        <div className="stat-box-label">{t('admin.analytics.statFirstVisit')}</div>
                                        <div className="stat-box-value">{formatDate(userStats.statistics.firstVisitAt)}</div>
                                    </div>
                                    <div className="stat-box">
                                        <div className="stat-box-label">{t('admin.analytics.statLastVisit')}</div>
                                        <div className="stat-box-value">{formatDate(userStats.statistics.lastVisitAt)}</div>
                                    </div>
                                    <div className="stat-box">
                                        <div className="stat-box-label">{t('admin.analytics.statDaysSinceFirstVisit')}</div>
                                        <div className="stat-box-value">{userStats.statistics.daysSinceFirstVisit} {t('admin.analytics.days')}</div>
                                    </div>
                                </div>
                            </div>

                            {userStats.sessions && userStats.sessions.length > 0 && (
                                <div className="user-sessions-list">
                                    <h3>{t('admin.analytics.userSessionsHistory')}</h3>
                                    <table className="sessions-table">
                                        <thead>
                                            <tr>
                                                <th>{t('admin.analytics.tableSessionId')}</th>
                                                <th>{t('admin.analytics.tableVisits')}</th>
                                                <th>{t('admin.analytics.tableTime')}</th>
                                                <th>{t('admin.analytics.sortTotalTime')}</th>
                                                <th>{t('admin.analytics.sortAvgTime')}</th>
                                                <th>{t('admin.analytics.tableSiteVersion')}</th>
                                                <th>{t('admin.analytics.tableLastVisit')}</th>
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
                        <div className="error-state">{t('admin.analytics.noDataAvailable')}</div>
                    )}
                </div>
            )}

            <div className="analytics-footer">
                <button onClick={fetchAnalytics} disabled={loading}>
                    {loading ? `🔄 ${t('admin.analytics.refreshing')}` : `🔄 ${t('admin.analytics.refresh')}`}
                </button>
            </div>
        </div>
    );
}
