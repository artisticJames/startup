/**
 * Start Up App Library
 * Reusable functions and utilities
 */

// ===== MODAL MANAGEMENT =====
const Modal = {
  // Open any modal by ID
  open(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'grid';
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }
  },

  // Close any modal by ID
  close(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = ''; // Restore scroll
    }
  },

  // Close all modals
  closeAll() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.style.display = 'none';
    });
    document.body.style.overflow = '';
  },

  // Setup auto-close for modal (call this after creating modal HTML)
  setupAutoClose(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      // Close on overlay click
      modal.querySelector('.overlay')?.addEventListener('click', () => this.close(modalId));
      // Close on close button click
      modal.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => this.close(modalId));
      });
      // Close on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'grid') {
          this.close(modalId);
        }
      });
    }
  }
};

// ===== GUIDE/RESOURCE DETAIL MODAL =====
const GuideModal = {
  // Show guide details in modal
  show(title, duration, description, steps) {
    document.getElementById('detailTitle').textContent = title;
    document.getElementById('detailDuration').textContent = duration;
    document.getElementById('detailDesc').textContent = description;
    
    const stepsList = document.getElementById('detailSteps');
    stepsList.innerHTML = '';
    if (steps && steps.length > 0) {
      steps.forEach(step => {
        const li = document.createElement('li');
        li.textContent = step.trim();
        stepsList.appendChild(li);
      });
    }
    
    Modal.open('detailModal');
  },

  // Setup click handlers for guide items
  setupGuideList(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.querySelectorAll('.guide').forEach(item => {
      item.addEventListener('click', () => {
        const title = item.getAttribute('data-title') || 'Guide';
        const duration = item.getAttribute('data-duration') || '';
        const desc = item.getAttribute('data-desc') || '';
        const steps = (item.getAttribute('data-steps') || '')
          .split(';')
          .map(s => s.trim())
          .filter(Boolean);
        
        this.show(title, duration, desc, steps);
      });
    });
  }
};

// ===== NAVIGATION UTILITIES =====
const Navigation = {
  // Set active tab in bottom navigation
  setActiveTab(tabName) {
    document.querySelectorAll('.tabbar .tab').forEach(tab => {
      tab.classList.remove('active');
      if (tab.href.includes(tabName)) {
        tab.classList.add('active');
      }
    });
  },

  // Navigate to page with query parameters
  navigateTo(page, params = {}) {
    const url = new URL(page, window.location.origin);
    Object.keys(params).forEach(key => {
      url.searchParams.set(key, params[key]);
    });
    window.location.href = url.toString();
  },

  // Get query parameter value
  getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }
};

// ===== QUOTE MANAGEMENT =====
const QuoteManager = {
  async fetchDailyQuote() {
    const quoteText = document.getElementById('quoteText');
    const quoteAuthor = document.getElementById('quoteAuthor');
    
    if (!quoteText || !quoteAuthor) {
      console.log('Quote elements not found');
      return;
    }

    console.log('Fetching daily quote...');

    try {
      const res = await fetch('/api/quote', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        quoteText.textContent = data.text || 'The only way to do great work is to love what you do.';
        quoteAuthor.textContent = data.author || 'Steve Jobs';
        return;
      }
    } catch (error) {
      console.log('Quote proxy failed:', error.message);
    }

    // Offline/last resort static
    quoteText.textContent = 'The only way to do great work is to love what you do.';
    quoteAuthor.textContent = 'Steve Jobs';
    console.log('Using fallback quote');
  }
};

// ===== USER ENTITLEMENTS =====
const Entitlements = {
  getTier() {
    return localStorage.getItem('userTier') || 'none';
  },

  setTier(tier) {
    localStorage.setItem('userTier', tier);
    this.apply();
  },

  isPremium() {
    return this.getTier() === 'premium';
  },

  isDemo() {
    return this.getTier() === 'demo';
  },

  getTierDisplayName() {
    const tier = this.getTier();
    switch(tier) {
      case 'premium': return 'Premium';
      case 'demo': return 'Demo';
      case 'none': 
      default: return 'Non';
    }
  },

  apply() {
    // Hide/show ads based on premium status (hide for premium and demo)
    document.querySelectorAll('.ad-slot').forEach(slot => {
      slot.style.display = (this.isPremium() || this.isDemo()) ? 'none' : '';
    });
    
    // Show/hide premium-only elements
    const premiumBadges = document.querySelectorAll('[data-premium-only]');
    premiumBadges.forEach(el => {
      el.style.display = this.isPremium() ? '' : 'none';
    });
  }
};

// ===== UI EFFECTS =====
const UIEffects = {
  // Add ripple effect to cards
  addRippleEffect(selector = '.card') {
    document.querySelectorAll(selector).forEach(card => {
      card.addEventListener('click', e => {
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        const rect = card.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
        card.appendChild(ripple);
        setTimeout(() => ripple.remove(), 450);
      });
    });
  },

  // Setup search filter
  setupSearchFilter(searchId, targetSelector) {
    const search = document.getElementById(searchId);
    if (!search) return;

    let searchTimeout;
    let aiSearchResults = null;

    search.addEventListener('input', () => {
      const query = search.value.trim();
      
      // Clear previous timeout
      clearTimeout(searchTimeout);
      
      if (query.length === 0) {
        // Show all cards when search is empty
        document.querySelectorAll(targetSelector).forEach(element => {
          const container = element.closest('.card') || element.closest('li');
          if (container) {
            container.style.display = '';
          }
        });
        hideAISearchResults();
        return;
      }

      // Regular text-based filtering for immediate results
      const queryLower = query.toLowerCase();
      document.querySelectorAll(targetSelector).forEach(element => {
        const match = element.textContent.toLowerCase().includes(queryLower);
        const container = element.closest('.card') || element.closest('li');
        if (container) {
          container.style.display = match ? '' : 'none';
        }
      });

      // AI search after user stops typing (debounced)
      searchTimeout = setTimeout(async () => {
        if (query.length >= 3) { // Only search for queries with 3+ characters
          await performAISearch(query);
        }
      }, 1000); // Wait 1 second after user stops typing
    });

    // Handle Enter key for immediate AI search
    search.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = search.value.trim();
        if (query.length >= 3) {
          await performAISearch(query);
        }
      }
    });

    async function performAISearch(query) {
      try {
        // Show loading state
        showAISearchLoading();
        
        const response = await fetch('/api/ai-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query })
        });

        if (response.ok) {
          const data = await response.json();
          showAISearchResults(data);
        } else {
          const error = await response.json();
          showAISearchError(error.error || 'AI search failed');
        }
      } catch (error) {
        console.error('AI search error:', error);
        showAISearchError('Network error. Please try again.');
      }
    }

    function showAISearchLoading() {
      hideAISearchResults();
      
      const loadingDiv = document.createElement('div');
      loadingDiv.id = 'ai-search-loading';
      loadingDiv.innerHTML = `
        <div style="padding: 20px; text-align: center; background: #f8f9fa; border-radius: 8px; margin: 10px 0;">
          <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #1f7a4c; border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite;"></div>
          <p style="margin: 10px 0 0; color: #6d7e78;">AI is analyzing your business question...</p>
        </div>
      `;
      
      const searchContainer = search.closest('.search') || search.parentElement;
      searchContainer.appendChild(loadingDiv);
    }

    function showAISearchResults(data) {
      hideAISearchResults();
      
      const resultsDiv = document.createElement('div');
      resultsDiv.id = 'ai-search-results';
      resultsDiv.innerHTML = `
        <div style="background: linear-gradient(135deg, #1f7a4c, #2d8f5f); color: white; padding: 20px; border-radius: 12px; margin: 10px 0; box-shadow: 0 4px 12px rgba(31, 122, 76, 0.3);">
          <div style="display: flex; align-items: center; margin-bottom: 15px;">
            <div style="background: rgba(255,255,255,0.2); padding: 8px; border-radius: 8px; margin-right: 12px;">
              🤖
            </div>
            <div>
              <h3 style="margin: 0; font-size: 18px; font-weight: 600;">AI Business Advisor</h3>
              <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">Search: "${data.query}"</p>
            </div>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px; line-height: 1.6;">
            ${data.response.replace(/\n/g, '<br>')}
          </div>
          <div style="margin-top: 12px; font-size: 12px; opacity: 0.8;">
            Powered by GPT-3.5 • ${new Date(data.timestamp).toLocaleTimeString()}
          </div>
        </div>
      `;
      
      const searchContainer = search.closest('.search') || search.parentElement;
      searchContainer.appendChild(resultsDiv);
    }

    function showAISearchError(message) {
      hideAISearchResults();
      
      const errorDiv = document.createElement('div');
      errorDiv.id = 'ai-search-error';
      errorDiv.innerHTML = `
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 16px; border-radius: 8px; margin: 10px 0;">
          <div style="display: flex; align-items: center;">
            <span style="margin-right: 8px;">⚠️</span>
            <span>${message}</span>
          </div>
        </div>
      `;
      
      const searchContainer = search.closest('.search') || search.parentElement;
      searchContainer.appendChild(errorDiv);
    }

    function hideAISearchResults() {
      const existing = document.getElementById('ai-search-loading') || 
                     document.getElementById('ai-search-results') || 
                     document.getElementById('ai-search-error');
      if (existing) {
        existing.remove();
      }
    }
  }
};

// ===== API UTILITIES =====
const API = {
  baseURL: (typeof window !== 'undefined') ? `${window.location.origin.replace(/\/$/, '')}/api` : 'http://localhost:3000/api',
  
  // Get auth token
  getToken() {
    return localStorage.getItem('authToken');
  },

  // Set auth token
  setToken(token) {
    localStorage.setItem('authToken', token);
  },

  // Remove auth token
  removeToken() {
    localStorage.removeItem('authToken');
  },

  // Make API request
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Authentication methods
  async register(email, password, name) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    });
  },

  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  },

  async logout() {
    this.removeToken();
    localStorage.removeItem('userData');
  },

  async getProfile() {
    return this.request('/auth/profile');
  },

  async updateProfile(name, profile_picture) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, profile_picture })
    });
  },

  async upgradeToPremium() {
    return this.request('/auth/upgrade', { method: 'POST' });
  },

  async activateDemo() {
    const userData = localStorage.getItem('userData');
    if (!userData) {
      throw new Error('No user data found');
    }
    
    const user = JSON.parse(userData);
    const response = await this.request('/activate-demo', {
      method: 'POST',
      body: JSON.stringify({ email: user.email })
    });
    
    if (response.ok) {
      // Update local storage
      this.setTier('demo');
    }
    
    return response;
  },

  // Posts methods
  async getPosts() {
    return this.request('/posts');
  },

  async createPost(content, image_url = null) {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify({ content, image_url })
    });
  },

  async likePost(postId) {
    return this.request(`/posts/${postId}/like`, { method: 'POST' });
  },

  async deletePost(postId) {
    return this.request(`/posts/${postId}`, { method: 'DELETE' });
  },

  // Comments methods
  async getComments(postId) {
    return this.request(`/comments/post/${postId}`);
  },

  async createComment(postId, content) {
    return this.request(`/comments/post/${postId}`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  },

  async likeComment(commentId) {
    return this.request(`/comments/${commentId}/like`, { method: 'POST' });
  },

  async deleteComment(commentId) {
    return this.request(`/comments/${commentId}`, { method: 'DELETE' });
  }
};

// ===== STORAGE UTILITIES =====
const Storage = {
  // Save user data
  saveUser(userData) {
    localStorage.setItem('userData', JSON.stringify(userData));
  },

  // Get user data
  getUser() {
    const data = localStorage.getItem('userData');
    return data ? JSON.parse(data) : null;
  },

  // Save profile picture (as base64)
  saveProfilePicture(base64Data) {
    localStorage.setItem('profilePicture', base64Data);
  },

  // Get profile picture
  getProfilePicture() {
    return localStorage.getItem('profilePicture');
  }
};

// ===== INITIALIZATION =====
const App = {
  // Initialize common functionality
  init() {
    // Add ripple styles
    const rippleStyle = document.createElement('style');
    rippleStyle.textContent = `
      .card{position:relative;overflow:hidden}
      .ripple{position:absolute;border-radius:999px;background:rgba(31,122,76,.15);transform:scale(0);animation:ripple .45s ease-out}
      @keyframes ripple{to{transform:scale(1);opacity:0}}
    `;
    document.head.appendChild(rippleStyle);

    // Apply entitlements
    Entitlements.apply();

    // Setup modal auto-close
    Modal.setupAutoClose('detailModal');
    Modal.setupAutoClose('upsellModal');
  }
};

// Make everything available globally
window.Modal = Modal;
window.GuideModal = GuideModal;
window.Navigation = Navigation;
window.QuoteManager = QuoteManager;
window.Entitlements = Entitlements;
window.UIEffects = UIEffects;
window.Storage = Storage;
window.API = API;
window.App = App;
