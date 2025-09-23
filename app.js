// Initialize the app using the library
document.addEventListener('DOMContentLoaded', () => {
  App.init();
  
  // Setup page-specific functionality
  UIEffects.addRippleEffect('.card');
  UIEffects.setupSearchFilter('search', '.card .title');
  
  // Load daily quote
  QuoteManager.fetchDailyQuote();
  
  // Setup bottom tab navigation
  document.querySelectorAll('.tabbar .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      Navigation.setActiveTab(tab.href.split('/').pop().split('.')[0]);
    });
  });
});
