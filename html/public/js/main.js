document.addEventListener('DOMContentLoaded', function () {

    // --- Hero Gallery ---
    var slides = document.querySelectorAll('.hero-slide');
    var indicators = document.querySelectorAll('.hero-indicator');

    if (slides.length > 1) {
        var current = 0;
        var total = slides.length;

        function goToSlide(index) {
            slides[current].classList.remove('active');
            slides[current].style.animation = 'none';
            if (indicators[current]) indicators[current].classList.remove('active');

            current = index;

            void slides[current].offsetWidth;
            slides[current].classList.add('active');
            slides[current].style.animation = '';
            if (indicators[current]) indicators[current].classList.add('active');
        }

        var timer = setInterval(function () {
            goToSlide((current + 1) % total);
        }, 6000);

        indicators.forEach(function (btn, i) {
            btn.addEventListener('click', function () {
                clearInterval(timer);
                goToSlide(i);
                timer = setInterval(function () {
                    goToSlide((current + 1) % total);
                }, 6000);
            });
        });
    }

    // --- Mobile Menu ---
    var toggle = document.querySelector('.mobile-menu-toggle');
    var navLinks = document.querySelector('.nav-links');

    if (toggle && navLinks) {
        toggle.addEventListener('click', function () {
            toggle.classList.toggle('active');
            navLinks.classList.toggle('active');
            document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
        });

        navLinks.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                toggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    // --- Header Scroll ---
    var header = document.querySelector('header');
    var lastScrollY = window.scrollY;

    function updateHeader() {
        var y = window.scrollY;

        if (y > 80) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        if (y > lastScrollY && y > 300) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }

        lastScrollY = y;
    }

    window.addEventListener('scroll', updateHeader, { passive: true });

    // --- Scroll Reveal ---
    var reveals = document.querySelectorAll('.reveal');

    document.querySelectorAll(
        '.services-grid, .work-gallery, .benefits-grid, .testimonials-grid, ' +
        '.values-grid, .team-grid, .features-grid, .stats-grid, .projects-grid'
    ).forEach(function (grid) {
        grid.querySelectorAll('.reveal').forEach(function (el, i) {
            el.style.transitionDelay = (i * 0.08) + 's';
        });
    });

    var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    reveals.forEach(function (el) {
        revealObserver.observe(el);
    });

    // --- Project Filter ---
    var filterButtons = document.querySelectorAll('.filter-btn');
    var projectCards = document.querySelectorAll('.project-card');

    if (filterButtons.length && projectCards.length) {
        filterButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                filterButtons.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');

                var filter = btn.getAttribute('data-filter');

                projectCards.forEach(function (card) {
                    var cat = card.getAttribute('data-category');
                    if (filter === 'all' || cat === filter) {
                        card.style.display = '';
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(12px)';
                        setTimeout(function () {
                            card.style.transition = 'all 0.5s ease';
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        }, 50);
                    } else {
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(-8px)';
                        setTimeout(function () {
                            card.style.display = 'none';
                        }, 300);
                    }
                });
            });
        });
    }

    // --- Stat Number Animation ---
    var statNumbers = document.querySelectorAll('.stat-number');

    function animateNumber(el, start, end, duration, suffix) {
        var startTime = performance.now();
        function update(now) {
            var elapsed = now - startTime;
            var progress = Math.min(elapsed / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 4);
            el.textContent = Math.floor(start + (end - start) * eased) + suffix;
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    if (statNumbers.length) {
        var statsObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var el = entry.target;
                    var text = el.textContent;
                    var hasPct = text.indexOf('%') !== -1;
                    var hasSlash = text.indexOf('/') !== -1;

                    if (!hasPct && !hasSlash) {
                        var num = parseInt(text.replace('+', ''), 10);
                        if (!isNaN(num)) animateNumber(el, 0, num, 2000, '+');
                    } else if (hasPct) {
                        var num2 = parseInt(text.replace('%', ''), 10);
                        if (!isNaN(num2)) animateNumber(el, 0, num2, 2000, '%');
                    }

                    statsObserver.unobserve(el);
                }
            });
        }, { threshold: 0.3 });

        statNumbers.forEach(function (s) { statsObserver.observe(s); });
    }

    // --- Contact Form ---
    var contactForm = document.querySelector('form');

    if (contactForm) {
        contactForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            var required = contactForm.querySelectorAll('[required]');
            var valid = true;

            required.forEach(function (field) {
                if (!field.value.trim()) {
                    valid = false;
                    field.style.borderColor = '#ef4444';
                } else {
                    field.style.borderColor = '';
                }
            });

            if (!valid) {
                alert('Please fill in all required fields.');
                return;
            }

            var btn = contactForm.querySelector('button[type="submit"]');
            var originalText = btn.textContent;
            btn.textContent = 'Sending...';
            btn.disabled = true;

            try {
                var formData = {
                    name: contactForm.querySelector('[name="name"]').value,
                    email: contactForm.querySelector('[name="email"]').value,
                    phone: (contactForm.querySelector('[name="phone"]') || {}).value || '',
                    service: contactForm.querySelector('[name="service"]').value,
                    message: contactForm.querySelector('[name="message"]').value,
                };

                var response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });

                var result = await response.json();

                if (result.success) {
                    alert(result.message);
                    contactForm.reset();
                } else {
                    alert(result.message || 'Something went wrong. Please try again.');
                }
            } catch (err) {
                alert('Sorry, there was an error. Please try again or call us directly.');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
    }

    // --- Logo Proximity Zoom ---
    var logoImg = document.getElementById('logo');
    if (logoImg) {
        var clone = null;
        var overlay = null;
        var logoZoomed = false;
        var animating = false;
        var proximityRadius = 120;
        var zoomedSize = 280;

        document.addEventListener('mousemove', function (e) {
            if (animating) return;

            var rect = logoImg.getBoundingClientRect();
            var logoCX = rect.left + rect.width / 2;
            var logoCY = rect.top + rect.height / 2;
            var dist = Math.sqrt(Math.pow(e.clientX - logoCX, 2) + Math.pow(e.clientY - logoCY, 2));

            if (dist < proximityRadius && !logoZoomed) {
                logoZoomed = true;
                animating = true;

                // Create dark overlay
                overlay = document.createElement('div');
                overlay.className = 'logo-overlay';
                document.body.appendChild(overlay);
                overlay.offsetWidth;
                overlay.classList.add('visible');

                // Create a clone that flies out
                clone = logoImg.cloneNode(true);
                clone.removeAttribute('id');
                clone.className = 'logo-clone';
                clone.style.left = rect.left + 'px';
                clone.style.top = rect.top + 'px';
                clone.style.width = rect.width + 'px';
                clone.style.height = rect.height + 'px';
                document.body.appendChild(clone);

                // Hide original
                logoImg.style.visibility = 'hidden';

                // Force reflow then fly to center
                clone.offsetWidth;
                clone.style.left = (window.innerWidth - zoomedSize) / 2 + 'px';
                clone.style.top = (window.innerHeight - zoomedSize) / 2 + 'px';
                clone.style.width = zoomedSize + 'px';
                clone.style.height = zoomedSize + 'px';

                setTimeout(function () { animating = false; }, 500);
            }

            if (logoZoomed && !animating && clone) {
                var centerX = window.innerWidth / 2;
                var centerY = window.innerHeight / 2;
                var distFromCenter = Math.sqrt(Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2));

                if (distFromCenter > zoomedSize / 2 + 60) {
                    animating = true;
                    // Fly back to original spot
                    var orig = logoImg.getBoundingClientRect();
                    clone.style.left = orig.left + 'px';
                    clone.style.top = orig.top + 'px';
                    clone.style.width = orig.width + 'px';
                    clone.style.height = orig.height + 'px';

                    if (overlay) overlay.classList.remove('visible');

                    setTimeout(function () {
                        logoImg.style.visibility = '';
                        if (clone && clone.parentNode) clone.parentNode.removeChild(clone);
                        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
                        clone = null;
                        overlay = null;
                        logoZoomed = false;
                        animating = false;
                    }, 500);
                }
            }
        });
    }

    // --- Smooth scroll for anchor links ---
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            var id = link.getAttribute('href');
            if (id === '#') return;
            var target = document.querySelector(id);
            if (target) {
                e.preventDefault();
                var top = target.offsetTop - (header ? header.offsetHeight : 0);
                window.scrollTo({ top: top, behavior: 'smooth' });
            }
        });
    });
});
