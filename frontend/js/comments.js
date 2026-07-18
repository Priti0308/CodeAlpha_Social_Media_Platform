// comments.js - Comment addition and deletion operations

document.addEventListener('DOMContentLoaded', () => {
    // Bind Post Detail comment actions
    setupDetailCommentForm();
});

// Setup comment input validations and click handlers
function setupDetailCommentForm() {
    const input = document.getElementById('detail-comment-input');
    const btn = document.getElementById('detail-comment-submit-btn');

    if (input && btn) {
        // Toggle post submit button state
        input.addEventListener('input', () => {
            if (input.value.trim().length > 0) {
                btn.classList.add('active');
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            } else {
                btn.classList.remove('active');
                btn.style.opacity = '0.5';
                btn.style.pointerEvents = 'none';
            }
        });

        // Submit comment on button click
        btn.onclick = async () => {
            const commentVal = input.value.trim();
            if (!commentVal || !currentPostId) return;

            try {
                btn.disabled = true;
                const response = await apiFetch(`/comments/${currentPostId}`, {
                    method: 'POST',
                    body: { comment: commentVal }
                });
                const data = await response.json();

                if (data.success) {
                    showToast('Comment added!', 'success');
                    input.value = '';
                    
                    // Reset button state
                    btn.classList.remove('active');
                    btn.style.opacity = '0.5';
                    btn.style.pointerEvents = 'none';

                    // Append to stream
                    appendDetailCommentRow(data.comment);
                } else {
                    showToast(data.error || 'Failed to add comment.', 'error');
                }
                btn.disabled = false;
            } catch (err) {
                console.error(err);
                showToast('Error posting comment.', 'error');
                btn.disabled = false;
            }
        };
    }
}

// Appends comment row locally inside DOM
function appendDetailCommentRow(comment) {
    const wrapper = document.getElementById('detail-comments-wrapper');
    if (!wrapper) return;

    const currentUser = getCurrentUser();
    const item = document.createElement('div');
    item.className = 'comment-item anim-fade-in';
    item.id = `comment-item-${comment._id}`;
    
    // Logged in user is always comment author here
    const deleteBtnHTML = `<span class="comment-delete-btn" onclick="handleCommentDelete('${comment._id}')">Delete</span>`;

    item.innerHTML = `
        <img src="${getMediaUrl(comment.userId.profileImage)}" class="comment-avatar" alt="Avatar">
        <div>
            <div>
                <a href="/profile.html?username=${comment.userId.username}" class="comment-author-name">${comment.userId.username}</a>
                <span class="comment-text">${comment.comment}</span>
            </div>
            <div class="comment-meta">
                <span>Just now</span>
                ${deleteBtnHTML}
            </div>
        </div>
    `;
    wrapper.appendChild(item);
    
    // Auto-scroll to bottom of comment stream
    wrapper.scrollTop = wrapper.scrollHeight;
}

// Triggers deletion API call
async function handleCommentDelete(commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
        const response = await apiFetch(`/comments/${commentId}`, { method: 'DELETE' });
        const data = await response.json();

        if (data.success) {
            showToast('Comment deleted.', 'success');
            const row = document.getElementById(`comment-item-${commentId}`);
            if (row) row.remove();
        } else {
            showToast(data.error || 'Failed to delete comment.', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Communication error deleting comment.', 'error');
    }
}
