// CONFIG
const allowedIP = "174.160.180.19"; // replace with your IPv4
const adminName = "Caitlin";

// Detect user's IP using a free service (returns your public IP)
async function getUserIP() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip;
  } catch (err) {
    console.error("IP detection failed:", err);
    return null;
  }
}

// ELEMENTS
const postButton = document.getElementById('post-button');
const postsContainer = document.getElementById('posts');
const adminInput = document.getElementById('admin-post');

// Load saved posts
let savedPosts = JSON.parse(localStorage.getItem('livePosts')) || [];

function renderPosts() {
  postsContainer.innerHTML = '';
  if (savedPosts.length === 0) {
    postsContainer.innerHTML = '<p>No updates yet.</p>';
  } else {
    savedPosts.forEach(post => {
      const p = document.createElement('p');
      p.innerHTML = `📝 <strong>${post.name}</strong> (${post.date} ${post.time}): ${post.text}`;
      postsContainer.appendChild(p);
    });
  }
}

renderPosts();

// Show admin input only if IP matches
getUserIP().then(ip => {
  if (ip === allowedIP) {
    adminInput.style.display = 'flex';
  }
});

// Post new update
postButton.addEventListener('click', () => {
  const newPostText = document.getElementById('new-post').value.trim();
  if (!newPostText) return;

  const now = new Date();
  const post = {
    name: adminName,
    text: newPostText,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString()
  };

  savedPosts.unshift(post);
  localStorage.setItem('livePosts', JSON.stringify(savedPosts));
  renderPosts();
  document.getElementById('new-post').value = '';
});