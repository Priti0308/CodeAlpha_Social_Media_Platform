// post.js - Single Post details page manager

let currentPostId = null;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentPostId = urlParams.get('id');

    if (currentPostId) {
        fetchPostDetails(currentPostId);
    } else {
        showToast('No post ID specified.', 'error');
    }
});

// Queries single post endpoints and populates views
async function fetchPostDetails(postId) {
    try {
        const response = await apiFetch(`/posts/${postId}`);
        const data = await response.json();

        if (data.success) {
            renderPostDetails(data.post);
        } else {
            showToast(data.error || 'Failed to load post.', 'error');
        }
    } catch (err) {
        console.error('Error fetching post detail:', err);
    }
}

// Renders visual data on page
function renderPostDetails(post) {
    const mediaPane = document.getElementById('detail-media-pane');
    const authorHeader = document.getElementById('detail-author-info');
    const likesCount = document.getElementById('detail-likes-num');
    const likeBtn = document.getElementById('detail-like-btn');
    const shareBtn = document.getElementById('detail-share-btn');

    // 1. Render Media side
    if (mediaPane) {
        // Keep the heart pop element
        mediaPane.innerHTML = `
            ${renderPostMedia(post.image, "")}
            <div class="like-heart-pop" id="detail-heart-pop">&#x2764;</div>
        `;
    }

    // 2. Render Author Header
    if (authorHeader) {
        authorHeader.innerHTML = `
            <a href="/profile.html?username=${post.userId.username}">
                <img src="${getMediaUrl(post.userId.profileImage)}" class="post-author-avatar" alt="${post.userId.username}">
            </a>
            <div class="post-author-info">
                <a href="/profile.html?username=${post.userId.username}" class="post-author-name">${post.userId.username}</a>
                <span class="post-time">${new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
        `;
    }

    // 3. Set Likes counters
    const currentUser = getCurrentUser();
    const hasLiked = post.likes && post.likes.some(l => l._id.toString() === currentUser._id.toString());
    
    if (likesCount) likesCount.innerText = post.likes.length;
    if (likeBtn) {
        if (hasLiked) {
            likeBtn.innerText = '❤️';
            likeBtn.classList.add('liked');
        } else {
            likeBtn.innerText = '🤍';
            likeBtn.classList.remove('liked');
        }
    }

    // 4. Bind share button click
    if (shareBtn) {
        shareBtn.onclick = () => {
            const link = `${window.location.origin}/post.html?id=${post._id}`;
            navigator.clipboard.writeText(link).then(() => {
                showToast('Link copied to clipboard!', 'success');
            });
        };
    }

    // 5. Populate comments (including caption as first comment)
    populateCommentsList(post);
}

// Renders the comments logs inside scroll panel
function populateCommentsList(post) {
    const wrapper = document.getElementById('detail-comments-wrapper');
    if (!wrapper) return;

    wrapper.innerHTML = '';

    // First element: Caption
    const captionItem = document.createElement('div');
    captionItem.className = 'comment-item';
    captionItem.innerHTML = `
        <img src="${getMediaUrl(post.userId.profileImage)}" class="comment-avatar" alt="Avatar">
        <div>
            <div>
                <a href="/profile.html?username=${post.userId.username}" class="comment-author-name">${post.userId.username}</a>
                <span class="comment-text">${post.caption || 'No caption.'}</span>
            </div>
            <div class="comment-meta">
                <span>Just now</span>
            </div>
        </div>
    `;
    wrapper.appendChild(captionItem);

    // Dynamic comments
    if (post.comments && post.comments.length > 0) {
        const currentUser = getCurrentUser();

        post.comments.forEach(comment => {
            const block = document.createElement('div');
            block.className = 'comment-block anim-fade-in';
            block.id = `comment-block-${comment._id}`;
            block.style.marginBottom = '16px';
            
            const isCommentAuthor = currentUser && currentUser._id === comment.userId._id;
            const isPostAuthor = currentUser && currentUser._id === post.userId._id;
            const showDelete = isCommentAuthor || isPostAuthor;
            const deleteBtnHTML = showDelete ? `<span class="comment-delete-btn" onclick="handleCommentDelete('${comment._id}')">Delete</span>` : '';
            const replyBtnHTML = currentUser ? `<span class="comment-reply-btn" onclick="toggleReplyInput('${comment._id}')">Reply</span>` : '';

            // Generate HTML for nested replies
            let repliesHTML = '';
            if (comment.replies && comment.replies.length > 0) {
                // Sort replies chronologically (oldest first)
                const sortedReplies = [...comment.replies].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                sortedReplies.forEach(reply => {
                    if (reply.userId) {
                        const isReplyAuthor = currentUser && currentUser._id === reply.userId._id;
                        const showReplyDelete = isReplyAuthor || isCommentAuthor || isPostAuthor;
                        const replyDeleteBtnHTML = showReplyDelete ? `<span class="reply-delete-btn" onclick="handleReplyDelete('${comment._id}', '${reply._id}')">Delete</span>` : '';

                        repliesHTML += `
                            <div class="reply-item anim-fade-in" id="reply-item-${reply._id}" style="margin-top: 10px;">
                                <img src="${getMediaUrl(reply.userId.profileImage)}" class="reply-avatar" alt="Avatar">
                                <div>
                                    <div>
                                        <a href="/profile.html?username=${reply.userId.username}" class="reply-author-name">${reply.userId.username}</a>
                                        <span class="reply-text">${reply.comment}</span>
                                    </div>
                                    <div class="reply-meta">
                                        <span>${new Date(reply.createdAt).toLocaleDateString()}</span>
                                        ${replyDeleteBtnHTML}
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                });
            }

            block.innerHTML = `
                <div class="comment-item" id="comment-item-${comment._id}">
                    <img src="${getMediaUrl(comment.userId.profileImage)}" class="comment-avatar" alt="Avatar">
                    <div>
                        <div>
                            <a href="/profile.html?username=${comment.userId.username}" class="comment-author-name">${comment.userId.username}</a>
                            <span class="comment-text">${comment.comment}</span>
                        </div>
                        <div class="comment-meta">
                            <span>${new Date(comment.createdAt).toLocaleDateString()}</span>
                            ${replyBtnHTML}
                            ${deleteBtnHTML}
                        </div>
                    </div>
                </div>
                <div class="reply-input-box" id="reply-input-box-${comment._id}">
                    <input type="text" class="reply-input" id="reply-input-field-${comment._id}" placeholder="Reply to ${comment.userId.username}...">
                    <button class="reply-submit-btn" onclick="submitReply('${comment._id}')">Post</button>
                </div>
                <div class="replies-container" id="replies-container-${comment._id}">
                    ${repliesHTML}
                </div>
            `;
            wrapper.appendChild(block);
        });
    }
}

// Binds like controls
async function triggerDetailLike() {
    if (!currentPostId) return;
    const btn = document.getElementById('detail-like-btn');
    const count = document.getElementById('detail-likes-num');

    try {
        const response = await apiFetch(`/posts/${currentPostId}/like`, { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            if (data.liked) {
                btn.innerText = '❤️';
                btn.classList.add('liked');
            } else {
                btn.innerText = '🤍';
                btn.classList.remove('liked');
            }
            if (count) count.innerText = data.likesCount;
        }
    } catch (err) {
        console.error(err);
    }
}

// Double click details image to like
function triggerDetailDoubleTap() {
    const pop = document.getElementById('detail-heart-pop');
    if (pop) {
        pop.classList.add('heart-pop-active');
        setTimeout(() => pop.classList.remove('heart-pop-active'), 800);
    }

    const btn = document.getElementById('detail-like-btn');
    if (btn && !btn.classList.contains('liked')) {
        triggerDetailLike();
    }
}

// Toggle Inline Reply Input Form
function toggleReplyInput(commentId) {
    const inputBox = document.getElementById(`reply-input-box-${commentId}`);
    if (inputBox) {
        const isCurrentlyFlex = inputBox.style.display === 'flex';
        inputBox.style.display = isCurrentlyFlex ? 'none' : 'flex';
        if (!isCurrentlyFlex) {
            const inputField = document.getElementById(`reply-input-field-${commentId}`);
            if (inputField) inputField.focus();
        }
    }
}

// Submits Reply to Backend API and Appends to DOM
async function submitReply(commentId) {
    const inputField = document.getElementById(`reply-input-field-${commentId}`);
    if (!inputField) return;

    const replyVal = inputField.value.trim();
    if (!replyVal) return;

    try {
        const response = await apiFetch(`/comments/${commentId}/reply`, {
            method: 'POST',
            body: { comment: replyVal }
        });
        const data = await response.json();

        if (data.success) {
            showToast('Reply posted!', 'success');
            inputField.value = '';
            // Hide input box
            const inputBox = document.getElementById(`reply-input-box-${commentId}`);
            if (inputBox) inputBox.style.display = 'none';

            // Append new reply item to replies container
            const repliesContainer = document.getElementById(`replies-container-${commentId}`);
            if (repliesContainer) {
                const item = document.createElement('div');
                item.className = 'reply-item anim-fade-in';
                item.id = `reply-item-${data.reply._id}`;
                item.style.marginTop = '10px';

                const replyDeleteBtnHTML = `<span class="reply-delete-btn" onclick="handleReplyDelete('${commentId}', '${data.reply._id}')">Delete</span>`;

                item.innerHTML = `
                    <img src="${getMediaUrl(data.reply.userId.profileImage)}" class="reply-avatar" alt="Avatar">
                    <div>
                        <div>
                            <a href="/profile.html?username=${data.reply.userId.username}" class="reply-author-name">${data.reply.userId.username}</a>
                            <span class="reply-text">${data.reply.comment}</span>
                        </div>
                        <div class="reply-meta">
                            <span>Just now</span>
                            ${replyDeleteBtnHTML}
                        </div>
                    </div>
                `;
                repliesContainer.appendChild(item);
            }
        } else {
            showToast(data.error || 'Failed to post reply.', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Error posting reply.', 'error');
    }
}

// Triggers Reply deletion API call and removes element from DOM
async function handleReplyDelete(commentId, replyId) {
    if (!confirm('Are you sure you want to delete this reply?')) return;

    try {
        const response = await apiFetch(`/comments/${commentId}/reply/${replyId}`, { method: 'DELETE' });
        const data = await response.json();

        if (data.success) {
            showToast('Reply deleted.', 'success');
            const row = document.getElementById(`reply-item-${replyId}`);
            if (row) row.remove();
        } else {
            showToast(data.error || 'Failed to delete reply.', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Communication error deleting reply.', 'error');
    }
}
