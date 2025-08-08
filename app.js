const API_URL = "https://jsonplaceholder.typicode.com/posts?_limit=5";
const container = document.getElementById("posts-container");
const offlineEl = document.getElementById("offline");

// Load manifest.json and populate UI
fetch('manifest.json')
  .then(res => res.json())
  .then(manifest => {
    document.getElementById('app-name').textContent = manifest.name;
    document.getElementById('app-desc').textContent = manifest.description || '';
    if (manifest.icons && manifest.icons.length > 0) {
      document.getElementById('app-icon').src = manifest.icons[0].src;
    }
    if (manifest.shortcuts) {
      const list = document.getElementById('shortcuts-list');
      manifest.shortcuts.forEach(sc => {
        const btn = document.createElement('button');
        btn.className = 'shortcut-btn';
        btn.textContent = sc.name;
        btn.onclick = () => location.href = sc.url;
        list.appendChild(btn);
      });
    }
    if (manifest.screenshots) {
      const ssList = document.getElementById('screenshots-list');
      manifest.screenshots.forEach(ss => {
        const img = document.createElement('img');
        img.src = ss.src;
        img.alt = ss.label || 'Screenshot';
        img.className = 'screenshot-img';
        ssList.appendChild(img);
      });
    }
  });

function showOfflineMessage() {
  offlineEl.classList.remove("hidden");
}

function hideOfflineMessage() {
  offlineEl.classList.add("hidden");
}

function renderPosts(posts) {
  container.innerHTML = "";
  posts.forEach(post => {
    const card = document.createElement("div");
    card.className = "post-card";
    card.innerHTML = `
      <h3>${post.title}</h3>
      <p>${post.body}</p>
    `;
    container.appendChild(card);
  });
}

function fetchAndCachePosts() {
  fetch(API_URL)
    .then(r => {
      if (!r.ok) throw new Error("Network error");
      return r.json();
    })
    .then(posts => {
      hideOfflineMessage();
      renderPosts(posts);
      if ('caches' in window) {
        caches.open('zaq_myapp_v2').then(cache => {
          const response = new Response(JSON.stringify(posts), {
            headers: { 'Content-Type': 'application/json' }
          });
          cache.put(API_URL, response);
        });
      }
    })
    .catch(async () => {
      showOfflineMessage();
      if ('caches' in window) {
        const cached = await caches.match(API_URL);
        if (cached) {
          const posts = await cached.json();
          renderPosts(posts);
          return;
        }
      }
      container.innerHTML = "<p>No cached posts available.</p>";
    });
}

window.addEventListener('load', () => {
  fetchAndCachePosts();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('Service Worker registered'))
      .catch(err => console.warn('SW registration failed', err));
  }
});