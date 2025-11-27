"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from "@/components/BackButton";
import Spinner from "@/components/Spinner";
import './users.css';

export default function UsersManagementPage() {
    const router = useRouter();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [unauthorized, setUnauthorized] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    // Pagination et filtres
    const [limit, setLimit] = useState(50);
    const [offset, setOffset] = useState(0);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState('');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');
    
    // Édition
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);

    // Vérifier l'authentification et le rôle au chargement
    useEffect(() => {
        checkAuth();
    }, []);

    // Charger les utilisateurs après vérification de l'auth
    useEffect(() => {
        if (authChecked && !unauthorized) {
            fetchUsers();
        }
    }, [limit, offset, search, roleFilter, activeFilter, sortBy, sortOrder, authChecked, unauthorized]);

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/user');
            
            if (!response.ok) {
                if (response.status === 401) {
                    setIsAuthenticated(false);
                    setUnauthorized(true);
                    setError('Vous devez être connecté pour accéder à cette page.');
                    setTimeout(() => {
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
            setIsAuthenticated(true);
            
            // Normaliser le rôle pour la comparaison
            const normalizedRole = user.role?.trim()?.toLowerCase();
            const expectedRole = 'superadmin';
            
            // Vérifier le rôle superAdmin
            if (normalizedRole !== expectedRole) {
                console.warn('[Users Management] Accès refusé - Détails:', {
                    roleReçu: user.role,
                    roleNormalisé: normalizedRole,
                    roleAttendu: expectedRole
                });
                setUnauthorized(true);
                setError(`Accès refusé : vous devez être un admin pour accéder à cette page. Rôle actuel : "${user.role || 'non défini'}"`);
                setLoading(false);
                setAuthChecked(true);
                return;
            }

            console.log('[Users Management] Accès autorisé pour:', user.email);
            setAuthChecked(true);
        } catch (err) {
            console.error('[Users Management] Erreur vérification auth:', err);
            setIsAuthenticated(false);
            setUnauthorized(true);
            setError('Erreur lors de la vérification de votre session.');
            setLoading(false);
            setAuthChecked(true);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString(),
                sort_by: sortBy,
                sort_order: sortOrder
            });

            if (search) params.append('search', search);
            if (roleFilter) params.append('role', roleFilter);
            if (activeFilter !== '') params.append('is_active', activeFilter);

            const response = await fetch(`/api/admin/users?${params.toString()}`);

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Erreur lors de la récupération des utilisateurs');
            }

            const data = await response.json();
            setUsers(data.users || []);
            setTotal(data.total || 0);
        } catch (err) {
            console.error('[Users Management] Erreur récupération utilisateurs:', err);
            setError(err.message || 'Erreur lors de la récupération des utilisateurs');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user.id);
        setEditForm({
            email: user.email || '',
            role: user.role || 'user',
            is_active: user.is_active !== undefined ? user.is_active : true,
            name: user.name || '',
            last_name: user.last_name || ''
        });
        setSaveError(null);
    };

    const handleCancelEdit = () => {
        setEditingUser(null);
        setEditForm({});
        setSaveError(null);
    };

    const handleSave = async (userId) => {
        try {
            setSaving(true);
            setSaveError(null);

            const response = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: userId,
                    ...editForm
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Erreur lors de la mise à jour');
            }

            const data = await response.json();
            
            // Mettre à jour la liste locale
            setUsers(users.map(u => u.id === userId ? data.user : u));
            setEditingUser(null);
            setEditForm({});
        } catch (err) {
            console.error('[Users Management] Erreur sauvegarde:', err);
            setSaveError(err.message || 'Erreur lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    };

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setOffset(0); // Reset à la première page
    };

    const handleRoleFilter = (e) => {
        setRoleFilter(e.target.value);
        setOffset(0);
    };

    const handleActiveFilter = (e) => {
        setActiveFilter(e.target.value);
        setOffset(0);
    };

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
        setOffset(0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Jamais';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getRoleBadgeClass = (role) => {
        switch (role?.toLowerCase()) {
            case 'superadmin':
                return 'role-badge superadmin';
            case 'admin':
                return 'role-badge admin';
            default:
                return 'role-badge user';
        }
    };

    if (loading && !authChecked) {
        return (
            <div className="users-container">
                <div className="loading-container">
                    <Spinner size="large" variant="border" />
                    <p>Vérification des permissions...</p>
                </div>
            </div>
        );
    }

    if (unauthorized || (error && (error.includes('Accès refusé') || error.includes('superAdmin')))) {
        return (
            <div className="users-container">
                <div className="error-container">
                    <h2>Accès refusé</h2>
                    <p>{error}</p>
                    <BackButton href="/dashboard" label="Retour au dashboard" title="Retour au dashboard" />
                </div>
            </div>
        );
    }

    return (
        <div className="users-container">
            <div className="users-header">
                <BackButton href="/dashboard" title="Retour au dashboard" />
                <h1>Gestion des utilisateurs</h1>
                <p className="subtitle">Gérez les utilisateurs de l'application</p>
            </div>

            {error && !unauthorized && (
                <div className="error-message">
                    {error}
                    <button onClick={fetchUsers} className="retry-button">Réessayer</button>
                </div>
            )}

            <div className="filters-section">
                <div className="filter-group">
                    <label>Recherche</label>
                    <input
                        type="text"
                        placeholder="Email, nom, prénom..."
                        value={search}
                        onChange={handleSearch}
                        className="search-input"
                    />
                </div>
                <div className="filter-group">
                    <label>Rôle</label>
                    <select value={roleFilter} onChange={handleRoleFilter} className="filter-select">
                        <option value="">Tous</option>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="superAdmin">SuperAdmin</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label>Statut</label>
                    <select value={activeFilter} onChange={handleActiveFilter} className="filter-select">
                        <option value="">Tous</option>
                        <option value="true">Actif</option>
                        <option value="false">Inactif</option>
                    </select>
                </div>
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="loading-container">
                        <Spinner size="large" variant="border" />
                        <p>Chargement des utilisateurs...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="empty-state">
                        <p>Aucun utilisateur trouvé</p>
                    </div>
                ) : (
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('email')} className="sortable">
                                    Email {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('name')} className="sortable">
                                    Nom {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('last_name')} className="sortable">
                                    Prénom {sortBy === 'last_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('role')} className="sortable">
                                    Rôle {sortBy === 'role' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th>Statut</th>
                                <th onClick={() => handleSort('date_online')} className="sortable">
                                    Dernière connexion {sortBy === 'date_online' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('created_at')} className="sortable">
                                    Créé le {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className={!user.is_active ? 'inactive' : ''}>
                                    {editingUser === user.id ? (
                                        <>
                                            <td>
                                                <input
                                                    type="email"
                                                    value={editForm.email}
                                                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                                    className="edit-input"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={editForm.name}
                                                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                                    className="edit-input"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={editForm.last_name}
                                                    onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                                                    className="edit-input"
                                                />
                                            </td>
                                            <td>
                                                <select
                                                    value={editForm.role}
                                                    onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                                                    className="edit-select"
                                                >
                                                    <option value="user">User</option>
                                                    <option value="admin">Admin</option>
                                                    <option value="superAdmin">SuperAdmin</option>
                                                </select>
                                            </td>
                                            <td>
                                                <label className="switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={editForm.is_active}
                                                        onChange={(e) => setEditForm({...editForm, is_active: e.target.checked})}
                                                    />
                                                    <span className="slider"></span>
                                                </label>
                                            </td>
                                            <td colSpan="3">
                                                <div className="edit-actions">
                                                    <button
                                                        onClick={() => handleSave(user.id)}
                                                        disabled={saving}
                                                        className="save-button"
                                                    >
                                                        {saving ? 'Sauvegarde...' : '✓ Sauvegarder'}
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        disabled={saving}
                                                        className="cancel-button"
                                                    >
                                                        ✕ Annuler
                                                    </button>
                                                    {saveError && (
                                                        <span className="save-error">{saveError}</span>
                                                    )}
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td>{user.email}</td>
                                            <td>{user.name || '-'}</td>
                                            <td>{user.last_name || '-'}</td>
                                            <td>
                                                <span className={getRoleBadgeClass(user.role)}>
                                                    {user.role || 'user'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                                                    {user.is_active ? 'Actif' : 'Inactif'}
                                                </span>
                                            </td>
                                            <td>{formatDate(user.date_online)}</td>
                                            <td>{formatDate(user.created_at)}</td>
                                            <td>
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="edit-button"
                                                    title="Modifier"
                                                >
                                                    ✏️ Modifier
                                                </button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {total > limit && (
                <div className="pagination">
                    <button
                        onClick={() => setOffset(Math.max(0, offset - limit))}
                        disabled={offset === 0}
                        className="pagination-button"
                    >
                        ← Précédent
                    </button>
                    <span className="pagination-info">
                        {offset + 1} - {Math.min(offset + limit, total)} sur {total}
                    </span>
                    <button
                        onClick={() => setOffset(offset + limit)}
                        disabled={offset + limit >= total}
                        className="pagination-button"
                    >
                        Suivant →
                    </button>
                </div>
            )}
        </div>
    );
}

