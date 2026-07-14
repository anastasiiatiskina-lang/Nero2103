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
  var pageSlugs = ['', 'manifest', 'portfolio', 'audit', 'sites', 'identity', 'producing', 'contact'];

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
      if (idx === currentPage) {
        item.classList.add('active');
        item.setAttribute('aria-current', 'page');
      } else {
        item.classList.remove('active');
        item.removeAttribute('aria-current');
      }
    });
    // Update per-page SEO metadata for shared links and search indexing
    updateSeoMeta(pageSlugs[currentPage]);
  }

  /* ------------------------------------------------------------
     Per-page SEO metadata
     Sets document.title, meta[name=description] and canonical
     when the user navigates.
     ------------------------------------------------------------ */
  var SEO = {
    '': {
      title: 'NERO 21. Персональная студия продюсирования бренда. Санкт-Петербург',
      description: 'NERO 21. Персональная студия продюсирования бренда. Санкт-Петербург. Стратегия, стиль, вывод на рынок. Работаю с брендами оборотом от 40 миллионов в год.',
      canonical: 'https://nero21.studio/'
    },
    'manifest': {
      title: 'Манифест. NERO 21',
      description: 'Манифест NERO 21 основан на десяти правилах Капферера и Бастьена, фундаменте позиционирования брендов высокой стоимости.',
      canonical: 'https://nero21.studio/manifest'
    },
    'portfolio': {
      title: 'Работы. NERO 21',
      description: 'Проекты NERO 21: alexeytiskin, AMBRA, JOY ATELIER. Запуск брендов с нуля для производственных и премиальных компаний.',
      canonical: 'https://nero21.studio/portfolio'
    },
    'audit': {
      title: 'Диагностика бренда. 30 000 ₽. NERO 21',
      description: 'Диагностика бренда за 30 000 ₽ и две недели. Оценка позиционирования, визуального языка, коммуникации. Три точки, где бренд теряет стоимость.',
      canonical: 'https://nero21.studio/audit'
    },
    'sites': {
      title: 'Сайт для бренда. 250 000 ₽. NERO 21',
      description: 'Разработка сайта под ключ за 250 000 ₽ и четыре недели. Проектирование, вёрстка, публикация, аналитика. Бренд-бук идёт бонусом к сайту.',
      canonical: 'https://nero21.studio/sites'
    },
    'identity': {
      title: 'Стиль бренда. 350 000 ₽. NERO 21',
      description: 'Стиль бренда за 350 000 ₽ и шесть недель. Разработка визуального языка, сайта, каталога, визитной карточки. Все исходники передаются заказчику.',
      canonical: 'https://nero21.studio/identity'
    },
    'producing': {
      title: 'Полный цикл ведения бренда. 300 000 ₽ в месяц. NERO 21',
      description: 'Полный цикл ведения бренда. 300 000 ₽ в месяц. Стратегия, визуальный язык, упаковка, коммуникация, публикации. Проект AMBRA: от 900 000 до 1 200 000 ₽ за первый месяц продаж.',
      canonical: 'https://nero21.studio/producing'
    },
    'contact': {
      title: 'Контакты. NERO 21',
      description: 'Свяжитесь со студией NERO 21. Телефон +7 931 298 22 16. Telegram @AnastasiiaT21. Основатель Анастасия Тискина.',
      canonical: 'https://nero21.studio/contact'
    },
    'work/ambra': {
      title: 'AMBRA. Собственный запуск бренда выключателей для интерьера. Кейс NERO 21',
      description: 'AMBRA. Собственный запуск студии на базе Jung. Полный цикл продюсирования: имя, визуальный язык, сайт, соцсети, точечная реклама, выставка. Два заказа и от 900 000 до 1 200 000 ₽ выручки за первый месяц.',
      canonical: 'https://nero21.studio/work/ambra'
    }
  };

  function updateSeoMeta(slug) {
    var s = slug || '';
    var meta = SEO[s];
    if (!meta) return;

    if (document.title !== meta.title) document.title = meta.title;

    // <meta name="description">
    var descTag = document.querySelector('meta[name="description"]');
    if (descTag && descTag.getAttribute('content') !== meta.description) {
      descTag.setAttribute('content', meta.description);
    }

    // <link rel="canonical">
    var canonicalTag = document.querySelector('link[rel="canonical"]');
    if (canonicalTag && canonicalTag.getAttribute('href') !== meta.canonical) {
      canonicalTag.setAttribute('href', meta.canonical);
    }

    // Open Graph URL
    var ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl && ogUrl.getAttribute('content') !== meta.canonical) {
      ogUrl.setAttribute('content', meta.canonical);
    }

    // Open Graph title
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.getAttribute('content') !== meta.title) {
      ogTitle.setAttribute('content', meta.title);
    }

    // Open Graph description
    var ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && ogDesc.getAttribute('content') !== meta.description) {
      ogDesc.setAttribute('content', meta.description);
    }

    // Notify Yandex Metrika about SPA route change
    if (typeof window.ym === 'function') {
      try {
        window.ym(110491090, 'hit', meta.canonical, {
          title: meta.title,
          referer: document.referrer
        });
      } catch (e) { /* no-op */ }
    }
  }

  /* ------------------------------------------------------------
     4. NAVIGATION EVENT WIRING
     ------------------------------------------------------------ */

  // Make nav-items keyboard-accessible (they are <li> or <div>, not <button>)
  document.querySelectorAll('[data-page]').forEach(function (el) {
    // Skip if it's already a natively focusable element (like <a> or <button>)
    var tag = el.tagName.toLowerCase();
    if (tag !== 'a' && tag !== 'button') {
      if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    }

    function activate() {
      var idx = parseInt(el.dataset.page, 10);
      // If case view is open, close it silently and normalise URL before navigating
      if (document.body.classList.contains('case-open')) {
        var openView = document.querySelector('.case-view.open');
        if (openView) {
          openView.classList.remove('open');
          openView.setAttribute('aria-hidden', 'true');
        }
        document.body.classList.remove('case-open');
        if (/\/work\//i.test(window.location.pathname)) {
          history.replaceState({}, '', '/');
        }
      }
      goToPage(idx);
      if (mobileMenu && mobileMenu.classList.contains('open')) {
        mobileMenu.classList.remove('open');
        if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
      }
    }

    el.addEventListener('click', activate);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
      }
    });
  });

  if (navToggle) navToggle.addEventListener('click', function () {
    mobileMenu.classList.add('open');
    navToggle.setAttribute('aria-expanded', 'true');
    // Focus first item for keyboard users
    setTimeout(function () {
      var first = mobileMenu.querySelector('[data-page]');
      if (first) first.focus();
    }, 50);
  });
  if (mobileClose) mobileClose.addEventListener('click', function () {
    mobileMenu.classList.remove('open');
    if (navToggle) {
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.focus();
    }
  });

  // Inject "next page" button at the bottom of each page (visible on mobile via CSS)
  (function injectNextPageButtons() {
    var pageLabels = ['Главная', 'Манифест', 'Работы', 'Диагностика', 'Сайты', 'Стиль', 'Полный цикл', 'Контакты'];
    for (var i = 0; i < pages.length - 1; i++) {
      (function (idx) {
        var page = pages[idx];
        var container = page.querySelector('.producing-inner, .manifesto-text-col, .exp-grid, .hero-split') || page;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'page-next-btn';
        btn.setAttribute('aria-label', 'Перейти к разделу ' + pageLabels[idx + 1]);
        btn.innerHTML = 'Дальше · ' + pageLabels[idx + 1] + '<span class="page-next-arrow" aria-hidden="true"> ↓</span>';
        btn.addEventListener('click', function () {
          goToPage(idx + 1);
        });
        container.appendChild(btn);
      })(i);
    }
  })();

  // Wheel navigation with internal scroll priority
  var wheelLocked = false;
  window.addEventListener('wheel', function (e) {
    if (isTransitioning || wheelLocked) return;
    if (Math.abs(e.deltaY) < 4) return;
    // Do not navigate pages when a modal is open
    if (document.body.classList.contains('modal-open')) return;

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
    // Do not intercept keys when a modal is open or when typing in form fields
    if (document.body.classList.contains('modal-open')) return;
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
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
    // Note: Space key removed from navigation. It should activate focused button, not scroll page.
  });

  // Touch navigation with internal scroll priority
  var touchStartY = 0;
  window.addEventListener('touchstart', function (e) {
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });
  window.addEventListener('touchend', function (e) {
    if (document.body.classList.contains('modal-open')) return;
    if (isTransitioning) return;
    var diff = touchStartY - e.changedTouches[0].screenY;
    if (Math.abs(diff) < 80) return;

    // If current page has internal scroll and user is not at edge, let the page scroll normally
    var currentEl = pages[currentPage];
    if (currentEl && currentEl.scrollHeight > currentEl.clientHeight + 1) {
      var atTop = currentEl.scrollTop <= 0;
      var atBottom = currentEl.scrollTop + currentEl.clientHeight >= currentEl.scrollHeight - 1;
      if ((diff > 0 && !atBottom) || (diff < 0 && !atTop)) {
        return;
      }
    }

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

  // Track element that opened modal so we can restore focus on close
  var lastFocusedBeforeModal = null;

  /**
   * Get all focusable elements inside a container for focus trapping.
   */
  function getFocusable(container) {
    return container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
  }

  /**
   * Trap Tab focus within a modal so keyboard users can't tab out.
   */
  function trapFocus(e, modalEl) {
    if (e.key !== 'Tab') return;
    var focusables = getFocusable(modalEl);
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openModal(label) {
    if (label && modalEyebrow) modalEyebrow.textContent = label;
    if (!modal) return;
    lastFocusedBeforeModal = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    if (formStatus) formStatus.textContent = '';
    setTimeout(function () {
      var firstInput = contactForm && contactForm.querySelector('input:not([type="hidden"])');
      if (firstInput) firstInput.focus();
    }, 400);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    // Return focus to element that opened modal
    if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === 'function') {
      lastFocusedBeforeModal.focus();
      lastFocusedBeforeModal = null;
    }
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
    modal.addEventListener('keydown', function (e) {
      trapFocus(e, modal);
    });
  }

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
    var submitButton = contactForm.querySelector('.form-submit');
    var submitOriginalText = submitButton ? submitButton.textContent : '';
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

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Отправляю...';
        submitButton.classList.add('form-submit-loading');
      }
      formStatus.textContent = 'Отправляю заявку...';
      formStatus.style.color = '#0a7a3a';

      // Notify Yandex Metrika about conversion
      if (typeof window.ym === 'function') {
        try { window.ym(110491090, 'reachGoal', 'form_submit', { source: source }); } catch (err) {}
      }

      setTimeout(function () {
        contactForm.reset();
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = submitOriginalText;
          submitButton.classList.remove('form-submit-loading');
        }
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
  var lastFocusedBeforeRules = null;

  function openRulesModal() {
    if (!rulesModal) return;
    lastFocusedBeforeRules = document.activeElement;
    rulesModal.classList.add('open');
    rulesModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setTimeout(function () {
      if (rulesModalClose) rulesModalClose.focus();
    }, 50);
  }

  function closeRulesModal() {
    if (!rulesModal) return;
    rulesModal.classList.remove('open');
    rulesModal.setAttribute('aria-hidden', 'true');
    // Only unlock body scroll if the other modal is not open
    if (!modal || !modal.classList.contains('open')) {
      document.body.classList.remove('modal-open');
    }
    if (lastFocusedBeforeRules && typeof lastFocusedBeforeRules.focus === 'function') {
      lastFocusedBeforeRules.focus();
      lastFocusedBeforeRules = null;
    }
  }

  if (rulesTrigger) rulesTrigger.addEventListener('click', openRulesModal);
  if (rulesModalClose) rulesModalClose.addEventListener('click', closeRulesModal);
  if (rulesModal) {
    rulesModal.addEventListener('click', function (e) {
      if (e.target === rulesModal) closeRulesModal();
    });
    rulesModal.addEventListener('keydown', function (e) {
      trapFocus(e, rulesModal);
    });
  }

  // === Privacy Policy modal (152-ФЗ) ===
  var privacyModal = document.getElementById('privacyModal');
  var privacyModalClose = document.getElementById('privacyModalClose');
  var privacyTriggers = [
    document.getElementById('privacyTriggerContact'),
    document.getElementById('privacyTriggerMenu'),
    document.getElementById('privacyTriggerForm')
  ];
  var lastFocusedBeforePrivacy = null;

  function openPrivacyModal() {
    if (!privacyModal) return;
    lastFocusedBeforePrivacy = document.activeElement;
    privacyModal.classList.add('open');
    privacyModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setTimeout(function () {
      if (privacyModalClose) privacyModalClose.focus();
    }, 50);
  }

  function closePrivacyModal() {
    if (!privacyModal) return;
    privacyModal.classList.remove('open');
    privacyModal.setAttribute('aria-hidden', 'true');
    var otherOpen = (modal && modal.classList.contains('open')) ||
                    (rulesModal && rulesModal.classList.contains('open'));
    if (!otherOpen) {
      document.body.classList.remove('modal-open');
    }
    if (lastFocusedBeforePrivacy && typeof lastFocusedBeforePrivacy.focus === 'function') {
      lastFocusedBeforePrivacy.focus();
      lastFocusedBeforePrivacy = null;
    }
  }

  privacyTriggers.forEach(function (t) {
    if (t) t.addEventListener('click', openPrivacyModal);
  });
  if (privacyModalClose) privacyModalClose.addEventListener('click', closePrivacyModal);
  if (privacyModal) {
    privacyModal.addEventListener('click', function (e) {
      if (e.target === privacyModal) closePrivacyModal();
    });
    privacyModal.addEventListener('keydown', function (e) {
      trapFocus(e, privacyModal);
    });
  }

  // Combined Escape handler for all modals
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (modal && modal.classList.contains('open')) closeModal();
    if (rulesModal && rulesModal.classList.contains('open')) closeRulesModal();
    if (privacyModal && privacyModal.classList.contains('open')) closePrivacyModal();
    if (activeCaseView && activeCaseView.classList.contains('open')) closeCaseView();
  });

  /* ------------------------------------------------------------
     CASE STUDY ROUTER (/work/<slug>)
     ------------------------------------------------------------ */
  var caseViews = {
    'ambra': document.getElementById('caseAmbra')
  };
  var activeCaseView = null;
  var lastFocusedBeforeCase = null;

  function getCaseSlugFromURL() {
    var path = window.location.pathname.toLowerCase();
    var m = path.match(/\/work\/([a-z0-9\-]+)\/?$/);
    return m ? m[1] : null;
  }

  function openCaseView(slug, options) {
    var view = caseViews[slug];
    if (!view) return false;
    if (activeCaseView === view) return true;

    // Close other case if open
    if (activeCaseView) closeCaseView({ silent: true });

    lastFocusedBeforeCase = document.activeElement;
    view.classList.add('open');
    view.setAttribute('aria-hidden', 'false');
    document.body.classList.add('case-open');
    activeCaseView = view;

    // Reset scroll so users start from the hero
    view.scrollTop = 0;

    // SEO update
    updateSeoMeta('work/' + slug);

    // Focus the close button for keyboard users
    setTimeout(function () {
      var closeBtn = view.querySelector('.case-close');
      if (closeBtn) closeBtn.focus();
    }, 60);

    // History
    if (!options || !options.replace) {
      var target = '/work/' + slug;
      if (window.location.pathname !== target) {
        history.pushState({ caseSlug: slug }, '', target);
      }
    }
    return true;
  }

  function closeCaseView(options) {
    if (!activeCaseView) return;
    activeCaseView.classList.remove('open');
    activeCaseView.setAttribute('aria-hidden', 'true');
    activeCaseView = null;
    document.body.classList.remove('case-open');

    // Restore focus
    if (lastFocusedBeforeCase && typeof lastFocusedBeforeCase.focus === 'function') {
      lastFocusedBeforeCase.focus();
      lastFocusedBeforeCase = null;
    }

    if (options && options.silent) return;

    // Return to Portfolio in URL + view
    goToPage(2);
    // Explicit URL fix (goToPage handles push but if no page transition happens, ensure URL is correct)
    setTimeout(function () {
      if (!getCaseSlugFromURL() && window.location.pathname !== '/portfolio') {
        // goToPage will already have set /portfolio if index changed
      }
    }, 50);
  }

  // Bind Portfolio card links to open case view (intercept navigation)
  var prefetchedCases = {};
  var caseHeroImages = {
    'ambra': ['/ambra-cover-1200.webp', '/ambra-mirror-900.webp']
  };
  function prefetchCase(slug) {
    if (prefetchedCases[slug] || !caseHeroImages[slug]) return;
    prefetchedCases[slug] = true;
    caseHeroImages[slug].forEach(function (src) {
      var l = document.createElement('link');
      l.rel = 'prefetch';
      l.as = 'image';
      l.href = src;
      document.head.appendChild(l);
    });
  }
  document.querySelectorAll('[data-case]').forEach(function (el) {
    var slug = el.getAttribute('data-case');
    // Warm cache on hover / focus for instant open
    el.addEventListener('mouseenter', function () { prefetchCase(slug); });
    el.addEventListener('focus', function () { prefetchCase(slug); });
    el.addEventListener('click', function (e) {
      if (!slug || !caseViews[slug]) return;
      e.preventDefault();
      openCaseView(slug);
    });
  });

  // Bind close and back buttons inside each case view
  Object.keys(caseViews).forEach(function (slug) {
    var view = caseViews[slug];
    if (!view) return;
    view.querySelectorAll('.case-close, .case-nav-back').forEach(function (btn) {
      btn.addEventListener('click', function () { closeCaseView(); });
    });
  });

  // Handle browser Back/Forward
  window.addEventListener('popstate', function () {
    var caseSlug = getCaseSlugFromURL();
    if (caseSlug && caseViews[caseSlug]) {
      openCaseView(caseSlug, { replace: true });
    } else if (activeCaseView) {
      closeCaseView({ silent: true });
      var idx = getInitialPageFromURL();
      goToPage(idx);
    }
  });

  // On first load, if URL is a case URL, silently show Portfolio behind and open case
  var initialCase = getCaseSlugFromURL();
  if (initialCase && caseViews[initialCase]) {
    // Activate Portfolio (index 2) without a transition animation, then reveal case
    pages[currentPage].classList.remove('active');
    pages[2].classList.add('active');
    pages[2].style.transform = '';
    currentPage = 2;
    updateUI();
    openCaseView(initialCase, { replace: true });
  }
})();
