// @ts-nocheck
"use client";

import {useEffect, useState} from "react";
import BackButton from "@/components/BackButton";
import {useI18n} from "@/i18n/I18nContext";
import styles from "./page.module.css";

export default function MessagePage() {
    const {t} = useI18n();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [messageInput, setMessageInput] = useState("");
    const [messages, setMessages] = useState<any[]>([]);
    const [myUserId, setMyUserId] = useState<string | null>(null);
    const [conversationIds, setConversationIds] = useState<Set<string>>(new Set());
    const [messageToDelete, setMessageToDelete] = useState<any>(null);
    const [conversationToDelete, setConversationToDelete] = useState<any>(null);
    const [activeDropdown, setActiveDropdown] = useState<number | string | null>(null);
    
    interface User{
        id: number;
        name: string;
    }
    const [userList, setUserList] = useState<User[]>([]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch("/api/getAllUsers");
                if (!response.ok) throw new Error("Failed to fetch users");

                const data = await response.json();
                // Ici, data = { success: true, note: [...] }
                if (data?.note && Array.isArray(data.note)) {
                    setUserList(data.note);
                } else {
                    throw new Error("Invalid data format: expected { note: User[] }");
                }
            } catch (err) {
                console.error("Failed to load users:", err);
                setUserList([]); // Initialise à un tableau vide pour éviter l'erreur
            }
        };
        
        const fetchContextData = async () => {
            try {
                const userRes = await fetch("/api/user");
                if (userRes.ok) {
                    const userData = await userRes.json();
                    if (userData.id) setMyUserId(String(userData.id));
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
            sender_id: "me", // Utilisé localement
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
            }
        } catch (err) {
            console.error("Erreur envoi message:", err);
        }
    };

    const executeDeleteMessage = async () => {
        if (!messageToDelete) return;
        const msgId = messageToDelete.id;
        setMessageToDelete(null);
        
        // Optimistic update
        setMessages(prev => prev.filter(m => m.id !== msgId));
        
        try {
            const response = await fetch(`/api/messages?messageId=${msgId}`, {
                method: "DELETE",
            });
            
            if (!response.ok) {
                throw new Error("Failed to delete message");
            }
        } catch (err) {
            console.error("Erreur suppression message:", err);
        }
    };

    const executeDeleteConversation = async () => {
        if (!conversationToDelete) return;
        const otherUserId = conversationToDelete.id;
        setConversationToDelete(null);
        
        // Optimistic update
        setMessages([]);
        setConversationIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(String(otherUserId));
            return newSet;
        });
        setSelectedUser(null);
        
        try {
            const response = await fetch(`/api/messages?conversationWithUserId=${otherUserId}`, {
                method: "DELETE",
            });
            
            if (!response.ok) {
                throw new Error("Failed to delete conversation");
            }
        } catch (err) {
            console.error("Erreur suppression conversation:", err);
        }
    };

    const normalizeString = (str: string | undefined | null) => {
        return (str || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const filteredUsers = userList.filter(u => {
        // Retirer l'utilisateur actuel
        if (myUserId && String(u.id) === String(myUserId)) return false;
        
        if (!u.name || u.name === "null null" || u.name.trim() === "") return false;
        
        const isSearching = searchQuery.trim() !== "";
        const hasConversation = conversationIds.has(String(u.id));
        
        // Si aucune recherche en cours, n'afficher que les conversations existantes
        if (!isSearching && !hasConversation) return false;
        
        return normalizeString(u.name).includes(normalizeString(searchQuery));
    });

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <header className={styles.header}>
                    <BackButton href="/" title={t('dashboard.backToEDT')} />
                    <h1>{t('messagePage.title')}</h1>
                </header>

                <div className={styles.card}>
                    <div className={styles.mainContent}>
                        {/* Left side: Users list */}
                        <div className={styles.sidebar}>
                            <div className={styles.searchContainer}>
                                <div className={styles.searchWrapper}>
                                    <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none"
                                         stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                         strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder={t('messagePage.searchPlaceholder')}
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
                                        className={`${styles.userItem} ${selectedUser?.id === user.id ? styles.active : ""}`}
                                        onClick={() => setSelectedUser(user)}
                                    >
                                        <div className={styles.userName}>{user.name}</div>
                                        <div className={styles.userIndicator}></div>
                                    </div>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <div className={styles.noUsers}>
                                        {t('messagePage.noUsersFound')}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right side: Chat area */}
                        <div className={styles.chatArea}>
                            {selectedUser ? (
                                <>
                                    <div className={styles.chatHeader}>
                                        <h2>{selectedUser.name}</h2>
                                        <button 
                                            className={styles.deleteConversationBtn}
                                            onClick={() => setConversationToDelete(selectedUser)}
                                            title={t('messagePage.deleteConversation')}
                                        >
                                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg>
                                        </button>
                                    </div>
                                    <div className={styles.messagesContainer}>
                                        {messages.map(msg => {
                                            const isMe = String(msg.sender_id) !== String(selectedUser.id);
                                            const time = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                                            
                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={`${styles.messageWrapper} ${isMe ? styles.sentWrapper : styles.receivedWrapper}`}
                                                >
                                                    {isMe && (
                                                        <div className={styles.messageOptions}>
                                                            <button 
                                                                className={styles.dotsBtn} 
                                                                onClick={() => {
                                                                    setActiveDropdown(activeDropdown === msg.id ? null : msg.id);
                                                                }}
                                                            >
                                                                ⋮
                                                            </button>
                                                            {activeDropdown === msg.id && (
                                                                <>
                                                                    <div 
                                                                        style={{ position: 'fixed', inset: 0, zIndex: 9 }} 
                                                                        onClick={() => setActiveDropdown(null)} 
                                                                    />
                                                                    <div className={styles.dropdownMenu}>
                                                                        <button 
                                                                            onClick={() => {
                                                                                setActiveDropdown(null);
                                                                                setMessageToDelete(msg);
                                                                            }}
                                                                        >
                                                                            {t('messagePage.deleteMessage')}
                                                                        </button>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div
                                                        className={`${styles.messageBubble} ${isMe ? styles.sent : styles.received}`}>
                                                        {msg.text}
                                                        <div className={styles.messageTime}>{time}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className={styles.inputContainer}>
                                        <input
                                            type="text"
                                            placeholder={t('messagePage.writeMessage')}
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
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                                 strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                            </svg>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className={styles.emptyState}>
                                    {t('messagePage.selectUser')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {messageToDelete && (
                    <div className={styles.modalOverlay} onClick={() => setMessageToDelete(null)}>
                        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                            <h3>{t('messagePage.confirmDeleteTitle')}</h3>
                            <p>{t('messagePage.confirmDeleteText')}</p>
                            <div className={styles.modalActions}>
                                <button className={styles.cancelBtn} onClick={() => setMessageToDelete(null)}>
                                    {t('messagePage.cancel')}
                                </button>
                                <button className={styles.deleteBtn} onClick={executeDeleteMessage}>
                                    {t('messagePage.delete')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {conversationToDelete && (
                    <div className={styles.modalOverlay} onClick={() => setConversationToDelete(null)}>
                        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                            <h3>{t('messagePage.confirmDeleteConversationTitle')}</h3>
                            <p>{t('messagePage.confirmDeleteConversationText')}</p>
                            <div className={styles.modalActions}>
                                <button className={styles.cancelBtn} onClick={() => setConversationToDelete(null)}>
                                    {t('messagePage.cancel')}
                                </button>
                                <button className={styles.deleteBtn} onClick={executeDeleteConversation}>
                                    {t('messagePage.delete')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
