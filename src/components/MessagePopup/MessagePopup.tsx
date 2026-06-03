"use client";

import {useEffect, useState, useRef} from "react";
import {useRouter} from "next/navigation";
import {useI18n} from "@/i18n/I18nContext";
import styles from "./MessagePopup.module.css";

interface User {
    id: number;
    name: string;
}

interface MessagePopupProps {
    onClose: () => void;
}

export default function MessagePopup({ onClose }: MessagePopupProps) {
    const {t} = useI18n();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [messageInput, setMessageInput] = useState("");
    const [messages, setMessages] = useState<any[]>([]);
    const [myUserId, setMyUserId] = useState<string | null>(null);
    const [conversationIds, setConversationIds] = useState<Set<string>>(new Set());
    const [messageToDelete, setMessageToDelete] = useState<any>(null);
    const [conversationToDelete, setConversationToDelete] = useState<any>(null);
    const [activeDropdown, setActiveDropdown] = useState<number | string | null>(null);
    const [userList, setUserList] = useState<User[]>([]);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages update
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch("/api/getAllUsers");
                if (!response.ok) throw new Error("Failed to fetch users");
                const data = await response.json();
                if (data?.note && Array.isArray(data.note)) {
                    setUserList(data.note);
                } else {
                    throw new Error("Invalid data format: expected { note: User[] }");
                }
            } catch (err) {
                console.error("Failed to load users:", err);
                setUserList([]);
            }
        };
        
        const fetchContextData = async () => {
            try {
                const userRes = await fetch("/api/user");
                if (userRes.ok) {
                    const userData = await userRes.json();
                    if (userData.id) {
                        setMyUserId(String(userData.id));
                    }
                }
                const convRes = await fetch("/api/messages/conversations");
                if (convRes.ok) {
                    const convData = await convRes.json();
                    if (convData.success && convData.conversations) {
                        setConversationIds(new Set(convData.conversations.map(String)));
                    }
                }
            } catch (err) {
                console.error("Erreur chargement contexte:", err);
            }
        };
        
        fetchUsers();
        fetchContextData();
    }, []);

    useEffect(() => {
        if (!selectedUser) return;
        
        const fetchMessages = async () => {
            try {
                const response = await fetch(`/api/messages?userId=${selectedUser.id}`);
                if (!response.ok) throw new Error("Failed to fetch messages");
                const data = await response.json();
                if (data.success && data.messages) {
                    setMessages(data.messages);
                }
            } catch (err) {
                console.error("Erreur chargement messages:", err);
            }
        };
        fetchMessages();
    }, [selectedUser]);

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !selectedUser) return;
        
        const tempText = messageInput.trim();
        setMessageInput(""); 
        
        const tempMsg = {
            id: Date.now(),
            sender_id: "me",
            receiver_id: selectedUser.id,
            text: tempText,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempMsg]);
        
        try {
            const response = await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    receiverId: selectedUser.id,
                    text: tempText,
                }),
            });
            
            if (!response.ok) throw new Error("Failed to send message");
            
            const data = await response.json();
            if (data.success && data.message) {
                setMessages(prev => prev.map(m => m.id === tempMsg.id ? data.message : m));
                setConversationIds(prev => new Set(prev).add(String(selectedUser.id)));
            }
        } catch (err) {
            console.error("Erreur envoi message:", err);
        }
    };

    const executeDeleteMessage = async () => {
        if (!messageToDelete) return;
        const msgId = messageToDelete.id;
        setMessageToDelete(null);
        
        setMessages(prev => prev.filter(m => m.id !== msgId));
        
        try {
            await fetch(`/api/messages?messageId=${msgId}`, { method: "DELETE" });
        } catch (err) {
            console.error("Erreur suppression message:", err);
        }
    };

    const executeDeleteConversation = async () => {
        if (!conversationToDelete) return;
        const otherUserId = conversationToDelete.id;
        setConversationToDelete(null);
        
        setMessages([]);
        setConversationIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(String(otherUserId));
            return newSet;
        });
        setSelectedUser(null);
        
        try {
            await fetch(`/api/messages?conversationWithUserId=${otherUserId}`, { method: "DELETE" });
        } catch (err) {
            console.error("Erreur suppression conversation:", err);
        }
    };

    const normalizeString = (str: string | undefined | null) => {
        return (str || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const filteredUsers = userList.filter(u => {
        if (myUserId && String(u.id) === String(myUserId)) return false;
        if (!u.name || u.name === "null null" || u.name.trim() === "") return false;
        
        const isSearching = searchQuery.trim() !== "";
        const hasConversation = conversationIds.has(String(u.id));
        
        if (!isSearching && !hasConversation) return false;
        return normalizeString(u.name).includes(normalizeString(searchQuery));
    });

    return (
        <div className={styles.popupContainer}>
            <div className={styles.popupHeader}>
                {selectedUser ? (
                    <div className={styles.headerLeft}>
                        <button className={styles.iconBtn} onClick={() => setSelectedUser(null)}>
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                        </button>
                        <h2>{selectedUser.name}</h2>
                    </div>
                ) : (
                    <h2>{t('navbar.message') || "Messages"}</h2>
                )}
                <div className={styles.headerRight}>
                    {selectedUser && (
                        <button 
                            className={`${styles.iconBtn} ${styles.deleteBtn}`}
                            onClick={() => setConversationToDelete(selectedUser)}
                            title={t('messagePage.deleteConversation') || "Supprimer la conversation"}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    )}
                    <button className={styles.iconBtn} onClick={onClose} title="Fermer">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>

            <div className={styles.popupContent}>
                {!selectedUser ? (
                    <div className={styles.sidebar}>
                        <div className={styles.searchContainer}>
                            <div className={styles.searchWrapper}>
                                <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                                <input
                                    type="text"
                                    placeholder={t('messagePage.searchPlaceholder') || "Rechercher un contact..."}
                                    className={styles.searchInput}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className={styles.userList}>
                            {filteredUsers.map(user => (
                                <div
                                    key={user.id}
                                    className={styles.userItem}
                                    onClick={() => setSelectedUser(user)}
                                >
                                    <div className={styles.userName}>{user.name}</div>
                                    {conversationIds.has(String(user.id)) && (
                                        <div className={styles.userIndicator}></div>
                                    )}
                                </div>
                            ))}
                            {filteredUsers.length === 0 && (
                                <div className={styles.noUsers}>
                                    {t('messagePage.noUsersFound') || "Aucun utilisateur trouvé"}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className={styles.chatArea}>
                        <div className={styles.messagesContainer}>
                            {messages.map(msg => {
                                const isMe = String(msg.sender_id) !== String(selectedUser.id);
                                const time = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                                
                                return (
                                    <div key={msg.id} className={`${styles.messageWrapper} ${isMe ? styles.sentWrapper : styles.receivedWrapper}`}>
                                        {isMe && (
                                            <div className={styles.messageOptions}>
                                                <button 
                                                    className={styles.dotsBtn} 
                                                    onClick={() => setActiveDropdown(activeDropdown === msg.id ? null : msg.id)}
                                                >
                                                    ⋮
                                                </button>
                                                {activeDropdown === msg.id && (
                                                    <>
                                                        <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setActiveDropdown(null)} />
                                                        <div className={styles.dropdownMenu}>
                                                            <button onClick={() => { setActiveDropdown(null); setMessageToDelete(msg); }}>
                                                                {t('messagePage.deleteMessage') || "Supprimer"}
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        <div className={`${styles.messageBubble} ${isMe ? styles.sent : styles.received}`}>
                                            {msg.text}
                                            <div className={styles.messageTime}>{time}</div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className={styles.inputContainer}>
                            <input
                                type="text"
                                placeholder={t('messagePage.writeMessage') || "Écrire un message..."}
                                className={styles.messageInput}
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button
                                className={`${styles.sendButton} ${messageInput.trim() ? styles.sendButtonActive : ''}`}
                                onClick={handleSendMessage}
                                disabled={!messageInput.trim()}
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Modals within the popup container layout */}
            {messageToDelete && (
                <div className={styles.modalOverlay} onClick={() => setMessageToDelete(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3>{t('messagePage.confirmDeleteTitle') || "Supprimer le message"}</h3>
                        <p>{t('messagePage.confirmDeleteText') || "Êtes-vous sûr de vouloir supprimer ce message ?"}</p>
                        <div className={styles.modalActions}>
                            <button className={styles.cancelBtn} onClick={() => setMessageToDelete(null)}>
                                {t('messagePage.cancel') || "Annuler"}
                            </button>
                            <button className={styles.deleteBtn} onClick={executeDeleteMessage}>
                                {t('messagePage.delete') || "Supprimer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {conversationToDelete && (
                <div className={styles.modalOverlay} onClick={() => setConversationToDelete(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3>{t('messagePage.confirmDeleteConversationTitle') || "Supprimer la conversation"}</h3>
                        <p>{t('messagePage.confirmDeleteConversationText') || "Toute la conversation sera supprimée. Continuer ?"}</p>
                        <div className={styles.modalActions}>
                            <button className={styles.cancelBtn} onClick={() => setConversationToDelete(null)}>
                                {t('messagePage.cancel') || "Annuler"}
                            </button>
                            <button className={styles.deleteBtn} onClick={executeDeleteConversation}>
                                {t('messagePage.delete') || "Supprimer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
