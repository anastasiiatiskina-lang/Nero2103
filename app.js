/* ============================================================
   NERO 21 · Application logic
   ============================================================
   Handles:
   - Page transitions and animations
   - URL routing via History API (real paths like /producing)
   - Keyboard, wheel, touch navigation
   - Contact modal + rules modal
   - Form submission via FormSubmit
   ============================================================ */

(function () {
  'use strict';

  /* ------------------------------------------------------------
     0. SPA REDIRECT RESTORE
     If we came from 404.html via `?/producing`, restore real URL.
     ------------------------------------------------------------ */
  (function restoreSpaRedirect() {
    var l = window.location;
    if (l.search.indexOf('?/') === 0 || l.search.indexOf('&/') > -1) {
      var route = l.search.slice(2).split('&').map(function (s) {
        return s.replace(/~and~/g, '&');
      }).join('?');
      window.history.replaceState(null, '', l.pathname.slice(0, -1) + '/' + route + l.hash);
    }
  })();

  /* ------------------------------------------------------------
     1. STATE
     ------------------------------------------------------------ */
  var pages = document.querySelectorAll('.page');
  var navItems = document.querySelectorAll('.nav-item');
  var counter = document.getElementById('currentPage');
  var navToggle = document.getElementById('navToggle');
  var mobileMenu = document.getElementById('mobileMenu');
  var mobileClose = document.getElementById('mobileClose');

  var currentPage = 0;
  var isTransitioning = false;
  var syncingFromURL = false;
  var totalPages = pages.length;

  // Real URL paths for each page (index 0 = home = '/')
  var pageSlugs = ['', 'manifest', 'portfolio', 'audit', 'identity', 'producing', 'contact'];

  /* ------------------------------------------------------------
     2. URL ROUTING (pushState based, real paths)
     ------------------------------------------------------------ */

  function slugToIndex(slug) {
    if (!slug) return 0;
    var s = slug.toLowerCase().replace(/^\//, '').replace(/\/$/, '');
    var idx = pageSlugs.indexOf(s);
    return idx >= 0 ? idx : 0;
  }

  function getInitialPageFromURL() {
    // Extract slug from pathname. Handles both custom domain and github.io hosting.
    var path = window.location.pathname;
    // Strip potential repo prefix (e.g. /Nero2103/)
    var parts = path.split('/').filter(function (p) { return p.length; });
    if (!parts.length) return 0;
    var last = parts[parts.length - 1].toLowerCase();
    // Legacy hash support
    if (last === 'index.html' || last === 'nero2103') {
      var hash = window.location.hash.slice(1);
      return slugToIndex(hash);
    }
    return slugToIndex(last);
  }

  function updateURL(index) {
    if (syncingFromURL) return;
    var slug = pageSlugs[index];
    var currentPath = window.location.pathname;
    // Determine base path (strips trailing slug or filename)
    var pathParts = currentPath.split('/').filter(function (p) { return p.length; });
    var basePath = '/';
    if (pathParts.length && pageSlugs.indexOf(pathParts[pathParts.length - 1].toLowerCase()) < 0
        && pathParts[pathParts.length - 1].toLowerCase() !== 'index.html') {
      // Preserve subdirectory (github.io/Nero2103)
      basePath = '/' + pathParts.slice(0, pathParts.length).join('/') + '/';
    } else if (pathParts.length && pageSlugs.indexOf(pathParts[pathParts.length - 1].toLowerCase()) >= 0) {
      basePath = '/' + pathParts.slice(0, pathParts.length - 1).join('/');
      if (basePath !== '/') basePath += '/';
    }
    var newPath = slug ? basePath + slug : basePath;
    if (window.location.pathname !== newPath) {
      history.pushState({ page: index }, '', newPath);
    }
  }

  /* ------------------------------------------------------------
     3. PAGE TRANSITIONS
     ------------------------------------------------------------ */

  function goToPage(index) {
    if (isTransitioning || index === currentPage || index < 0 || index >= totalPages) return;
    isTransitioning = true;

    var prev = pages[currentPage];
    var next = pages[index];

    if (index > currentPage) {
      prev.classList.add('exit-up');
    } else {
      prev.style.transform = 'translateY(60px)';
    }
    prev.classList.remove('active');

    setTimeout(function () {
      prev.classList.remove('exit-up');
      prev.style.transform = '';

      if (index > currentPage) {
        next.style.transform = 'translateY(60px)';
      } else {
        next.style.transform = 'translateY(-60px)';
      }
      // eslint-disable-next-line no-unused-expressions
      next.offsetHeight;
      next.classList.add('active');
      next.style.transform = '';
      if (next.scrollTop) next.scrollTop = 0;

      currentPage = index;
      updateUI();
      updateURL(index);

      setTimeout(function () {
        isTransitioning = false;
      }, 900);
    }, 400);
  }

  function updateUI() {
    if (counter) counter.textContent = String(currentPage + 1).padStart(2, '0');
    navItems.forEach(function (item) {
      var idx = parseInt(item.dataset.page, 10);
      if (idx === currentPage) item.classList.add('active');
      else item.classList.remove('active');
    });
    // Update document title dynamically for shared links
    var slug = pageSlugs[currentPage];
    var titles = {
      '': 'NERO 21 — Архитектура брендов высокой стоимости',
      'manifest': 'Manifest — NERO 21',
      'portfolio': 'Portfolio — NERO 21',
      'audit': 'Brand Audit · 30 000 ₽ — NERO 21',
      'identity': 'Brand Identity · 350 000 ₽ — NERO 21',
      'producing': 'Producing · 300 000 ₽/мес — NERO 21',
      'contact': 'Contact — NERO 21'
    };
    if (titles[slug]) document.title = titles[slug];
  }

  /* ------------------------------------------------------------
     4. NAVIGATION EVENT WIRING
     ------------------------------------------------------------ */

  document.querySelectorAll('[data-page]').forEach(function (el) {
    el.addEventListener('click', function () {
      var idx = parseInt(el.dataset.page, 10);
      goToPage(idx);
      if (mobileMenu && mobileMenu.classList.contains('open')) mobileMenu.classList.remove('open');
    });
  });

  if (navToggle) navToggle.addEventListener('click', function () { mobileMenu.classList.add('open'); });
  if (mobileClose) mobileClose.addEventListener('click', function () { mobileMenu.classList.remove('open'); });

  // Wheel navigation with internal scroll priority
  var wheelLocked = false;
  window.addEventListener('wheel', function (e) {
    if (isTransitioning || wheelLocked) return;
    if (Math.abs(e.deltaY) < 4) return;

    var currentEl = pages[currentPage];
    if (currentEl && currentEl.scrollHeight > currentEl.clientHeight + 1) {
      var atTop = currentEl.scrollTop <= 0;
      var atBottom = currentEl.scrollTop + currentEl.clientHeight >= currentEl.scrollHeight - 1;
      if ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop)) {
        return;
      }
    }

    wheelLocked = true;
    var dir = e.deltaY > 0 ? 1 : -1;
    goToPage(currentPage + dir);
    setTimeout(function () { wheelLocked = false; }, 1200);
  }, { passive: true });

  // Keyboard navigation
  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      goToPage(currentPage + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      goToPage(currentPage - 1);
    } else if (e.key === 'Home') {
      goToPage(0);
    } else if (e.key === 'End') {
      goToPage(totalPages - 1);
    }
  });

  // Touch navigation
  var touchStartY = 0;
  window.addEventListener('touchstart', function (e) {
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });
  window.addEventListener('touchend', function (e) {
    var diff = touchStartY - e.changedTouches[0].screenY;
    if (Math.abs(diff) < 50) return;
    if (diff > 0) goToPage(currentPage + 1);
    else goToPage(currentPage - 1);
  }, { passive: true });

  /* ------------------------------------------------------------
     5. INITIAL PAGE FROM URL + POPSTATE
     ------------------------------------------------------------ */

  (function initFromURL() {
    var initialPage = getInitialPageFromURL();
    if (initialPage > 0 && initialPage < totalPages) {
      pages[0].classList.remove('active');
      pages[initialPage].classList.add('active');
      pages[initialPage].style.transform = '';
      currentPage = initialPage;
    }
  })();

  updateUI();

  window.addEventListener('popstate', function (e) {
    var idx = e.state && typeof e.state.page === 'number' ? e.state.page : getInitialPageFromURL();
    if (idx !== currentPage) {
      syncingFromURL = true;
      goToPage(idx);
      setTimeout(function () { syncingFromURL = false; }, 100);
    }
  });

  /* ------------------------------------------------------------
     6. CONTACT MODAL
     ------------------------------------------------------------ */

  var modal = document.getElementById('contactModal');
  var modalCloseBtn = document.getElementById('modalClose');
  var modalEyebrow = document.getElementById('modalEyebrow');
  var contactForm = document.getElementById('contactForm');
  var formStatus = document.getElementById('formStatus');
  var formSubject = document.getElementById('form-subject');

  function openModal(label) {
    if (label && modalEyebrow) modalEyebrow.textContent = label;
    if (modal) modal.classList.add('open');
    if (formStatus) formStatus.textContent = '';
    setTimeout(function () {
      var firstInput = contactForm && contactForm.querySelector('input:not([type="hidden"])');
      if (firstInput) firstInput.focus();
    }, 400);
  }

  function closeModal() {
    if (modal) modal.classList.remove('open');
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modal) modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  document.querySelectorAll('[data-modal-trigger]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      openModal(btn.dataset.modalTrigger);
    });
  });

  document.querySelectorAll('[data-cross-page]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      var idx = parseInt(el.dataset.crossPage, 10);
      goToPage(idx);
    });
  });

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      var phone = contactForm.elements['Телефон'].value.trim();
      var tg = contactForm.elements['Telegram'].value.trim();
      var email = contactForm.elements['Email'].value.trim();
      var source = (modalEyebrow && modalEyebrow.textContent) || 'Заявка с сайта nero21';

      if (!phone && !tg && !email) {
        e.preventDefault();
        formStatus.textContent = 'Заполните хотя бы одно поле для связи.';
        formStatus.style.color = '#a55';
        return;
      }

      if (formSubject) formSubject.value = source;

      formStatus.textContent = 'Отправляю заявку...';
      formStatus.style.color = '#0a7a3a';

      setTimeout(function () {
        contactForm.reset();
        closeModal();
      }, 1500);
    });
  }

  /* ------------------------------------------------------------
     7. RULES MODAL (Kapferer & Bastien)
     ------------------------------------------------------------ */

  var rulesModal = document.getElementById('rulesModal');
  var rulesTrigger = document.getElementById('rulesTrigger');
  var rulesModalClose = document.getElementById('rulesModalClose');

  function openRulesModal() {
    if (rulesModal) rulesModal.classList.add('open');
  }
  function closeRulesModal() {
    if (rulesModal) rulesModal.classList.remove('open');
  }

  if (rulesTrigger) rulesTrigger.addEventListener('click', openRulesModal);
  if (rulesModalClose) rulesModalClose.addEventListener('click', closeRulesModal);
  if (rulesModal) {
    rulesModal.addEventListener('click', function (e) {
      if (e.target === rulesModal) closeRulesModal();
    });
  }

  // Combined Escape handler for both modals
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (modal && modal.classList.contains('open')) closeModal();
    if (rulesModal && rulesModal.classList.contains('open')) closeRulesModal();
  });
})();
