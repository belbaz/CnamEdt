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
        fetchUsers();
    }, []);

    const messages = [
        {id: 1, senderId: 1, text: "Bonjour, as-tu le cours d'hier ?", time: "10:30"},
    ];

    const normalizeString = (str: string | undefined | null) => {
        return (str || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const filteredUsers = userList.filter(u => {
        if (!u.name || u.name === "null null" || u.name.trim() === "") return false;
        return normalizeString(u.name).includes(normalizeString(searchQuery));
    });

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <header className={styles.header}>
                    <BackButton href="/dashboard" title={t('common.back')}/>
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
                                        <div className={styles.headerStatus}>
                                            <span className={styles.statusDot}></span> En ligne
                                        </div>
                                    </div>
                                    <div className={styles.messagesContainer}>
                                        {messages.map(msg => (
                                            <div
                                                key={msg.id}
                                                className={`${styles.messageWrapper} ${msg.senderId === "me" ? styles.sentWrapper : styles.receivedWrapper}`}
                                            >
                                                <div
                                                    className={`${styles.messageBubble} ${msg.senderId === "me" ? styles.sent : styles.received}`}>
                                                    {msg.text}
                                                    <div className={styles.messageTime}>{msg.time}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className={styles.inputContainer}>
                                        <input
                                            type="text"
                                            placeholder={t('messagePage.writeMessage')}
                                            className={styles.messageInput}
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && setMessageInput('')}
                                        />
                                        <button
                                            className={`${styles.sendButton} ${messageInput.trim() ? styles.sendButtonActive : ''}`}
                                            onClick={() => setMessageInput("")}
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
            </div>
        </div>
    );
}
