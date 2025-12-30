/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./js/**/*.js",
        "./app.js"
    ],
    theme: {
        extend: {
            colors: {
                // Light theme (default)
                primary: {
                    50: '#f0f7ff',
                    100: '#e0efff',
                    200: '#badefc',
                    300: '#7cc2fa',
                    400: '#36a3f5',
                    500: '#0c87e6',
                    600: '#006bc4',
                    700: '#0154a0',
                    800: '#064783',
                    900: '#0b3c6d',
                },
                accent: {
                    green: '#10b981',
                    red: '#ef4444',
                    orange: '#f59e0b',
                    purple: '#8b5cf6',
                },
                // Theme-specific colors will be applied via data attributes
            },
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
                mono: ['SFMono-Regular', 'Consolas', 'monospace'],
            },
            spacing: {
                xs: '0.375rem',
                sm: '0.5rem',
                md: '0.75rem',
                lg: '1rem',
                xl: '1.5rem',
                '2xl': '2rem',
            },
            borderRadius: {
                sm: '0.25rem',
                md: '0.375rem',
                lg: '0.5rem',
                xl: '0.625rem',
                '2xl': '0.75rem',
            },
            fontSize: {
                xs: '0.75rem',
                sm: '0.8125rem',
                base: '0.875rem',
                lg: '1rem',
                xl: '1.125rem',
                '2xl': '1.25rem',
                '3xl': '1.5rem',
            },
            boxShadow: {
                sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
                DEFAULT: '0 2px 4px rgba(0, 0, 0, 0.06)',
                md: '0 2px 4px rgba(0, 0, 0, 0.06)',
                lg: '0 4px 8px rgba(0, 0, 0, 0.08)',
                xl: '0 8px 16px rgba(0, 0, 0, 0.1)',
            },
            transitionDuration: {
                fast: '100ms',
                base: '150ms',
                slow: '200ms',
            },
            animation: {
                'fade-in': 'fadeIn 0.2s ease',
                'fade-in-up': 'fadeInUp 0.3s ease',
                'slide-up': 'slideUp 0.3s ease',
                'slide-in-right': 'slideInRight 0.3s ease',
                'slide-out-right': 'slideOutRight 0.3s ease',
                'spin': 'spin 0.8s linear infinite',
            },
            keyframes: {
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                fadeInUp: {
                    from: { opacity: '0', transform: 'translateY(20px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                slideUp: {
                    from: { transform: 'translateY(100px)', opacity: '0' },
                    to: { transform: 'translateY(0)', opacity: '1' },
                },
                slideInRight: {
                    from: { transform: 'translateX(100px)', opacity: '0' },
                    to: { transform: 'translateX(0)', opacity: '1' },
                },
                slideOutRight: {
                    to: { transform: 'translateX(100px)', opacity: '0' },
                },
            },
        },
    },
    plugins: [],
}
