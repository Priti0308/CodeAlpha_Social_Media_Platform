// messages.js - Direct messaging thread loads, real-time polling, and sending logic

let activeRecipientId = null;
let pollingInterval = null;
let chatHistoryLength = 0;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial conversations load
    loadConversations().then(() => {
        // 2. Handle profile message click redirect (username query parameter)
        handleQueryParameterUser();
    });

    // 3. Form submit bindings
    const messageForm = document.getElementById('chat-message-form');
    if (messageForm) {
        messageForm.addEventListener('submit', handleSendMessage);
    }

    // 4. Mobile back button binding
    const backBtn = document.getElementById('chat-mobile-back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            const sidebar = document.getElementById('conversations-sidebar-panel');
            const chatPane = document.getElementById('chat-pane-panel');
            if (sidebar && chatPane) {
                sidebar.classList.remove('hidden-mobile');
                chatPane.classList.remove('active-mobile');
            }
            stopPolling();
            activeRecipientId = null;
            // Clear active selection in list
            document.querySelectorAll('.conversation-item').forEach(item => item.classList.remove('active'));
        });
    }

    // 5. Initialize the New Chat modal
    initNewChatModal();
});

// Load the list of conversations for the sidebar
async function loadConversations() {
    const listWrapper = document.getElementById('conversations-list-wrapper');
    if (!listWrapper) return;

    try {
        const response = await apiFetch('/messages/conversations');
        const data = await response.json();

        if (data.success) {
            listWrapper.innerHTML = '';
            
            if (data.conversations.length === 0) {
                listWrapper.innerHTML = `
                    <div style="padding: 40px 20px; text-align: center; color: var(--gray-400); font-size: 0.9rem;">
                        No conversations yet. Start a chat by visiting a creator's profile page!
                    </div>
                `;
                return;
            }

            data.conversations.forEach(conv => {
                const item = document.createElement('div');
                item.className = `conversation-item ${conv.unreadCount > 0 ? 'unread' : ''} ${activeRecipientId === conv.user._id ? 'active' : ''}`;
                item.id = `conv-item-${conv.user._id}`;
                
                const dateStr = new Date(conv.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
                
                item.innerHTML = `
                    <img src="${getMediaUrl(conv.user.profileImage)}" class="conversation-avatar" alt="${conv.user.username}">
                    <div class="conversation-details">
                        <div class="conversation-meta">
                            <span class="conversation-username">${conv.user.username}</span>
                            <span class="conversation-time">${dateStr}</span>
                        </div>
                        <div class="conversation-preview-row">
                            <span class="conversation-last-msg">${conv.lastMessage}</span>
                            ${conv.unreadCount > 0 ? `<span class="conversation-unread-dot"></span>` : ''}
                        </div>
                    </div>
                `;
                
                item.onclick = () => selectConversation(conv.user);
                listWrapper.appendChild(item);
            });
        }
    } catch (err) {
        console.error('Error loading conversations:', err);
    }
}

// Check for username in URL and initiate chat
async function handleQueryParameterUser() {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');
    if (!username) return;

    // Check if user is already in our list of active conversations
    const items = document.querySelectorAll('.conversation-item');
    let existingItem = null;
    
    // Clean trailing/leading spaces
    const cleanUsername = username.toLowerCase().trim();

    items.forEach(item => {
        const usernameDisp = item.querySelector('.conversation-username').innerText.toLowerCase().trim();
        if (usernameDisp === cleanUsername) {
            existingItem = item;
        }
    });

    if (existingItem) {
        // Conversation already exists, click it
        existingItem.click();
    } else {
        // User not in recent chat list, fetch their details to open a new conversation stub
        try {
            const response = await apiFetch(`/users/profile/${cleanUsername}`);
            const data = await response.json();
            if (data.success && data.user) {
                const user = data.user;
                
                // Add temporary item to conversations list
                const listWrapper = document.getElementById('conversations-list-wrapper');
                if (listWrapper) {
                    // Remove "No conversations yet" text if present
                    if (listWrapper.innerText.includes('No conversations yet')) {
                        listWrapper.innerHTML = '';
                    }

                    const tempItem = document.createElement('div');
                    tempItem.className = 'conversation-item active';
                    tempItem.id = `conv-item-${user._id}`;
                    tempItem.innerHTML = `
                        <img src="${getMediaUrl(user.profileImage)}" class="conversation-avatar" alt="${user.username}">
                        <div class="conversation-details">
                            <div class="conversation-meta">
                                <span class="conversation-username">${user.username}</span>
                                <span class="conversation-time">Now</span>
                            </div>
                            <div class="conversation-preview-row">
                                <span class="conversation-last-msg" style="font-style: italic;">Drafting first message...</span>
                            </div>
                        </div>
                    `;
                    tempItem.onclick = () => selectConversation(user);
                    listWrapper.insertBefore(tempItem, listWrapper.firstChild);
                }
                
                selectConversation(user);
            } else {
                showToast('Unable to initiate chat with this user.', 'error');
            }
        } catch (err) {
            console.error('Error fetching creator profiles:', err);
        }
    }
}

// Select recipient and load chat logs
async function selectConversation(recipient) {
    activeRecipientId = recipient._id;
    chatHistoryLength = 0;
    
    // UI selections highlight
    document.querySelectorAll('.conversation-item').forEach(item => item.classList.remove('active'));
    const activeItem = document.getElementById(`conv-item-${recipient._id}`);
    if (activeItem) {
        activeItem.classList.add('active');
        activeItem.classList.remove('unread');
        const dot = activeItem.querySelector('.conversation-unread-dot');
        if (dot) dot.remove();
    }

    // Toggle panels for Mobile view
    const sidebar = document.getElementById('conversations-sidebar-panel');
    const chatPane = document.getElementById('chat-pane-panel');
    const backBtn = document.getElementById('chat-mobile-back-btn');
    if (window.innerWidth <= 768) {
        if (sidebar) sidebar.classList.add('hidden-mobile');
        if (chatPane) chatPane.classList.add('active-mobile');
        if (backBtn) backBtn.style.display = 'block';
    }

    // Load Recipient metadata headers
    const recipientAvatar = document.getElementById('chat-recipient-avatar');
    const recipientUsername = document.getElementById('chat-recipient-username');
    const recipientFullname = document.getElementById('chat-recipient-fullname');
    
    if (recipientAvatar) recipientAvatar.src = getMediaUrl(recipient.profileImage);
    if (recipientUsername) recipientUsername.innerText = recipient.username;
    if (recipientFullname) recipientFullname.innerText = recipient.name || recipient.username;

    // Toggle view wrappers
    const emptyWrapper = document.getElementById('chat-empty-state-wrapper');
    const activeWrapper = document.getElementById('chat-active-wrapper');
    if (emptyWrapper) emptyWrapper.style.display = 'none';
    if (activeWrapper) activeWrapper.style.display = 'flex';

    // Load history and start refreshing
    await loadChatHistory(recipient._id);
    startPolling(recipient._id);
    
    // Mark as read
    await apiFetch(`/messages/chat/${recipient._id}/read`, { method: 'POST' });
}

// Fetch message dialogue records
async function loadChatHistory(recipientId) {
    const stream = document.getElementById('chat-messages-stream');
    if (!stream) return;

    try {
        const response = await apiFetch(`/messages/chat/${recipientId}`);
        const data = await response.json();

        if (data.success) {
            // Only update DOM if new messages have arrived
            if (data.chat.length !== chatHistoryLength) {
                stream.innerHTML = '';
                
                if (data.chat.length === 0) {
                    stream.innerHTML = `
                        <div style="margin: auto; color: var(--gray-400); font-size: 0.88rem; text-align: center;">
                            Say hello! Share greetings with ${document.getElementById('chat-recipient-username').innerText}.
                        </div>
                    `;
                } else {
                    data.chat.forEach(msg => {
                        const row = document.createElement('div');
                        const isSent = msg.senderId === recipientId ? 'received' : 'sent';
                        row.className = `message-row ${isSent}`;
                        
                        const timeStr = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        
                        row.innerHTML = `
                            <div class="message-bubble">
                                <div class="message-content">${msg.content}</div>
                                <span class="message-time">${timeStr}</span>
                            </div>
                        `;
                        stream.appendChild(row);
                    });
                }
                
                chatHistoryLength = data.chat.length;
                scrollToBottom();
            }
        }
    } catch (err) {
        console.error('Error fetching chat history:', err);
    }
}

// Send Message handler
async function handleSendMessage(e) {
    e.preventDefault();
    
    const input = document.getElementById('chat-message-input');
    if (!input || !input.value.trim() || !activeRecipientId) return;

    const messageContent = input.value.trim();
    input.value = ''; // Clean input instantly for visual responsiveness

    try {
        const response = await apiFetch('/messages/send', {
            method: 'POST',
            body: {
                receiverId: activeRecipientId,
                content: messageContent
            }
        });
        const data = await response.json();

        if (data.success) {
            // Append sent message instantly
            const stream = document.getElementById('chat-messages-stream');
            if (stream) {
                // Clear default empty text if present
                if (stream.innerText.includes('Say hello!')) {
                    stream.innerHTML = '';
                }

                const row = document.createElement('div');
                row.className = 'message-row sent';
                const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                row.innerHTML = `
                    <div class="message-bubble">
                        <div class="message-content">${messageContent}</div>
                        <span class="message-time">${timeStr}</span>
                    </div>
                `;
                stream.appendChild(row);
                scrollToBottom();
                chatHistoryLength++;
            }
            
            // Reload sidebar to update snippets
            loadConversations();
        } else {
            showToast(data.error || 'Failed to send message.', 'error');
        }
    } catch (err) {
        console.error('Error sending message:', err);
        showToast('Error communicating with server.', 'error');
    }
}

// Setup long polling interval
function startPolling(recipientId) {
    stopPolling();
    
    pollingInterval = setInterval(async () => {
        if (activeRecipientId === recipientId) {
            await loadChatHistory(recipientId);
            // Refresh conversation threads in background
            loadConversations();
        }
    }, 3000);
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

function scrollToBottom() {
    const stream = document.getElementById('chat-messages-stream');
    if (stream) {
        stream.scrollTop = stream.scrollHeight;
    }
}

// 5. Initialize the New Chat Modal events
function initNewChatModal() {
    const btnNewChat = document.getElementById('btn-new-chat');
    const modal = document.getElementById('new-chat-modal');
    const btnClose = document.getElementById('close-new-chat-modal');

    if (btnNewChat && modal) {
        btnNewChat.addEventListener('click', () => {
            modal.style.display = 'flex';
            loadFollowedCreators();
        });
    }

    if (btnClose && modal) {
        btnClose.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}

// 6. Fetch creators the user is currently following and populate selection list
async function loadFollowedCreators() {
    const container = document.getElementById('followed-list-container');
    if (!container) return;

    container.innerHTML = `
        <div style="display: flex; justify-content: center; padding: 25px;">
            <div class="spinner"></div>
        </div>
    `;

    const user = getCurrentUser();
    if (!user || !user._id) {
        container.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--gray-500); font-size: 0.88rem;">
                Please log in to load creators list.
            </div>
        `;
        return;
    }

    try {
        const response = await apiFetch(`/follow/${user._id}/following`);
        const data = await response.json();

        if (data.success) {
            container.innerHTML = '';
            
            if (!data.following || data.following.length === 0) {
                container.innerHTML = `
                    <div style="padding: 30px 20px; text-align: center; color: var(--gray-400); font-size: 0.88rem; line-height: 1.4;">
                        You are not following any creators yet.<br>
                        <a href="/search.html" style="color: var(--primary-color); font-weight: 600; text-decoration: underline;">Explore creators</a> to follow and chat!
                    </div>
                `;
                return;
            }

            data.following.forEach(creator => {
                const row = document.createElement('div');
                row.className = 'user-select-row';
                row.innerHTML = `
                    <img src="${getMediaUrl(creator.profileImage)}" class="user-select-avatar" alt="${creator.username}">
                    <div style="flex-grow: 1; min-width: 0;">
                        <div style="font-weight: 700; font-size: 0.9rem; color: var(--dark-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${creator.username}</div>
                        <div style="font-size: 0.75rem; color: var(--gray-400); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${creator.name || creator.username}</div>
                    </div>
                `;

                row.onclick = () => {
                    document.getElementById('new-chat-modal').style.display = 'none';
                    initiateNewChatWithUser(creator);
                };

                container.appendChild(row);
            });
        } else {
            container.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #EF4444; font-size: 0.88rem;">
                    Failed to fetch followed users.
                </div>
            `;
        }
    } catch (err) {
        console.error('Error fetching followed users:', err);
        container.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #EF4444; font-size: 0.88rem;">
                Communication failure. Try again.
            </div>
        `;
    }
}

// 7. Initiate a new chat thread layout with a followed user
function initiateNewChatWithUser(creator) {
    const existingItem = document.getElementById(`conv-item-${creator._id}`);
    if (existingItem) {
        existingItem.click();
        return;
    }

    const listWrapper = document.getElementById('conversations-list-wrapper');
    if (listWrapper) {
        if (listWrapper.innerText.includes('No conversations yet') || listWrapper.innerText.includes('Start a chat')) {
            listWrapper.innerHTML = '';
        }

        const tempItem = document.createElement('div');
        tempItem.className = 'conversation-item active';
        tempItem.id = `conv-item-${creator._id}`;
        tempItem.innerHTML = `
            <img src="${getMediaUrl(creator.profileImage)}" class="conversation-avatar" alt="${creator.username}">
            <div class="conversation-details">
                <div class="conversation-meta">
                    <span class="conversation-username">${creator.username}</span>
                    <span class="conversation-time">Now</span>
                </div>
                <div class="conversation-preview-row">
                    <span class="conversation-last-msg" style="font-style: italic;">Drafting first message...</span>
                </div>
            </div>
        `;
        tempItem.onclick = () => selectConversation(creator);
        listWrapper.insertBefore(tempItem, listWrapper.firstChild);
    }
    
    selectConversation(creator);
}
