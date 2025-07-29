document.addEventListener('DOMContentLoaded', function() {
    // Error handling
    window.addEventListener('error', function(e) {
        console.warn('JavaScript error caught:', e.message);
    });
    
    // Theme Switch Functionality
    const themeSwitch = document.getElementById('themeToggle');
    const themeSwitchCheckbox = document.getElementById('themeSwitchCheckbox');
    
    if (!themeSwitch || !themeSwitchCheckbox) {
        console.warn('Theme switch elements not found');
        return;
    }
    
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    // Set initial theme and checkbox state
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeSwitchCheckbox.checked = currentTheme === 'dark';
    
    // Handle theme switch toggle
    function toggleTheme() {
        const newTheme = themeSwitchCheckbox.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Add smooth animation
        const slider = themeSwitch.querySelector('.theme-switch-slider');
        if (slider) {
            slider.style.transform = themeSwitchCheckbox.checked 
                ? 'translateX(28px) scale(1.1)' 
                : 'translateX(0) scale(1.1)';
            setTimeout(() => {
                slider.style.transform = themeSwitchCheckbox.checked 
                    ? 'translateX(28px)' 
                    : 'translateX(0)';
            }, 150);
        }
    }
    
    // Listen for checkbox changes (handles both click and keyboard)
    themeSwitchCheckbox.addEventListener('change', toggleTheme);
    
    // Ensure clicking anywhere on the switch works
    themeSwitch.addEventListener('click', function(e) {
        // Prevent double-triggering when clicking directly on checkbox
        if (e.target === themeSwitchCheckbox) {
            return;
        }
        
        // Toggle checkbox state and trigger change event
        themeSwitchCheckbox.checked = !themeSwitchCheckbox.checked;
        themeSwitchCheckbox.dispatchEvent(new Event('change'));
    });

    // Mobile menu functionality
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
            
            // Animate hamburger icon with construction theme
            const spans = this.querySelectorAll('span');
            spans.forEach((span, index) => {
                span.style.transform = navLinks.classList.contains('active') 
                    ? `rotate(${index === 1 ? 45 : -45}deg)` 
                    : 'rotate(0deg)';
                span.style.backgroundColor = navLinks.classList.contains('active') 
                    ? 'var(--construction-primary)' 
                    : '';
            });
        });
        
        // Close mobile menu when clicking on a link
        const navLinkItems = navLinks.querySelectorAll('a');
        navLinkItems.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            });
        });
    } else {
        console.warn('Mobile menu elements not found');
    }

    // Header scroll effect with enhanced animations
    const header = document.querySelector('header');
    let lastScrollY = window.scrollY;

    function updateHeader() {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        // Hide header on scroll down, show on scroll up
        if (currentScrollY > lastScrollY && currentScrollY > 200) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }
        
        lastScrollY = currentScrollY;
    }

    window.addEventListener('scroll', updateHeader);
    window.addEventListener('load', updateHeader);

    // Smooth scrolling for anchor links
    const smoothScrollLinks = document.querySelectorAll('a[href^="#"]');
    smoothScrollLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const headerHeight = header.offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add body padding for fixed header
    function adjustBodyPadding() {
        const headerHeight = header.offsetHeight;
        document.body.style.paddingTop = headerHeight + 'px';
    }

    window.addEventListener('load', adjustBodyPadding);
    window.addEventListener('resize', adjustBodyPadding);
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe all sections and their content
    document.querySelectorAll('section h2, section p, .service-card, .feature-card, .value-card, .team-member, .project-card, .work-item').forEach(el => {
        observer.observe(el);
    });
    
    // Add staggered animation delays for cards
    document.querySelectorAll('.service-card, .feature-card, .value-card, .team-member, .project-card, .work-item').forEach((card, index) => {
        card.style.transitionDelay = `${index * 0.1}s`;
    });

    // Form submission handling (basic)
    const contactForm = document.querySelector('form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Basic form validation
            const requiredFields = contactForm.querySelectorAll('[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.style.borderColor = '#ef4444';
                } else {
                    field.style.borderColor = '#d1d5db';
                }
            });
            
            if (isValid) {
                // Here you would typically send the form data to a server
                alert('Thank you for your message! We\'ll get back to you soon.');
                contactForm.reset();
            } else {
                alert('Please fill in all required fields.');
            }
        });
    }
    
    // Project filter functionality
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');
    
    if (filterButtons.length > 0 && projectCards.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                this.classList.add('active');
                
                // Get filter value
                const filterValue = this.getAttribute('data-filter');
                
                // Filter project cards
                projectCards.forEach(card => {
                    const cardCategory = card.getAttribute('data-category');
                    
                    if (filterValue === 'all' || cardCategory === filterValue) {
                        card.style.display = 'block';
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(20px)';
                        
                        // Animate in
                        setTimeout(() => {
                            card.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        }, 100);
                    } else {
                        card.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(-20px)';
                        
                        // Hide after animation
                        setTimeout(() => {
                            card.style.display = 'none';
                        }, 300);
                    }
                });
            });
        });
    }
    
    // Animate project cards on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const projectObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe project cards for animation
    projectCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        projectObserver.observe(card);
    });
    
    // Animate stats on scroll
    const statNumbers = document.querySelectorAll('.stat-number');
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const finalValue = target.textContent;
                const isPercentage = finalValue.includes('%');
                const isTime = finalValue.includes('/');
                
                if (!isPercentage && !isTime) {
                    const numericValue = parseInt(finalValue.replace('+', ''));
                    animateNumber(target, 0, numericValue, 2000, '+');
                } else if (isPercentage) {
                    const numericValue = parseInt(finalValue.replace('%', ''));
                    animateNumber(target, 0, numericValue, 2000, '%');
                }
                
                statsObserver.unobserve(target);
            }
        });
    }, observerOptions);
    
    statNumbers.forEach(stat => {
        statsObserver.observe(stat);
    });
    
    // Number animation function
    function animateNumber(element, start, end, duration, suffix = '') {
        const startTime = performance.now();
        
        function updateNumber(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(start + (end - start) * easeOutQuart);
            
            element.textContent = current + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            }
        }
        
        requestAnimationFrame(updateNumber);
    }
});