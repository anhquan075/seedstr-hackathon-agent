"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.designSystems = void 0;
exports.getDesignSystem = getDesignSystem;
exports.getDesignSystemNames = getDesignSystemNames;
/**
 * Pre-baked design systems to reduce LLM output variance
 * Each system includes tokens and component templates
 */
exports.designSystems = {
    glassmorphism: {
        name: 'glassmorphism',
        tokens: {
            colors: {
                primary: 'rgba(255, 255, 255, 0.1)',
                secondary: 'rgba(255, 255, 255, 0.05)',
                accent: '#60a5fa',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                foreground: '#ffffff',
                muted: 'rgba(255, 255, 255, 0.6)',
            },
            spacing: {
                xs: '0.5rem',
                sm: '1rem',
                md: '1.5rem',
                lg: '2rem',
                xl: '3rem',
            },
            typography: {
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: {
                    xs: '0.75rem',
                    sm: '0.875rem',
                    base: '1rem',
                    lg: '1.125rem',
                    xl: '1.25rem',
                    '2xl': '1.5rem',
                },
            },
            radius: {
                sm: '0.5rem',
                md: '1rem',
                lg: '1.5rem',
                full: '9999px',
            },
        },
        templates: {
            card: `
        <div style="
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 1rem;
          padding: 1.5rem;
        ">
          {content}
        </div>
      `,
            button: `
        <button style="
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 9999px;
          padding: 0.75rem 1.5rem;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        ">
          {label}
        </button>
      `,
        },
    },
    minimalist: {
        name: 'minimalist',
        tokens: {
            colors: {
                primary: '#000000',
                secondary: '#666666',
                accent: '#0066ff',
                background: '#ffffff',
                foreground: '#000000',
                muted: '#999999',
            },
            spacing: {
                xs: '0.25rem',
                sm: '0.5rem',
                md: '1rem',
                lg: '2rem',
                xl: '4rem',
            },
            typography: {
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                fontSize: {
                    xs: '0.75rem',
                    sm: '0.875rem',
                    base: '1rem',
                    lg: '1.25rem',
                    xl: '1.5rem',
                    '2xl': '2rem',
                },
            },
            radius: {
                sm: '0',
                md: '0',
                lg: '0',
                full: '0',
            },
        },
        templates: {
            card: `
        <div style="
          border: 1px solid #e0e0e0;
          padding: 2rem;
        ">
          {content}
        </div>
      `,
            button: `
        <button style="
          background: #000000;
          border: none;
          padding: 0.75rem 2rem;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s;
        ">
          {label}
        </button>
      `,
        },
    },
    neumorphism: {
        name: 'neumorphism',
        tokens: {
            colors: {
                primary: '#e0e5ec',
                secondary: '#ffffff',
                accent: '#5b9efe',
                background: '#e0e5ec',
                foreground: '#333333',
                muted: '#9baacf',
            },
            spacing: {
                xs: '0.5rem',
                sm: '1rem',
                md: '1.5rem',
                lg: '2rem',
                xl: '3rem',
            },
            typography: {
                fontFamily: "'Poppins', system-ui, sans-serif",
                fontSize: {
                    xs: '0.75rem',
                    sm: '0.875rem',
                    base: '1rem',
                    lg: '1.125rem',
                    xl: '1.25rem',
                    '2xl': '1.5rem',
                },
            },
            radius: {
                sm: '0.75rem',
                md: '1rem',
                lg: '1.5rem',
                full: '9999px',
            },
        },
        templates: {
            card: `
        <div style="
          background: #e0e5ec;
          box-shadow: 9px 9px 16px rgba(163, 177, 198, 0.6),
                      -9px -9px 16px rgba(255, 255, 255, 0.5);
          border-radius: 1rem;
          padding: 1.5rem;
        ">
          {content}
        </div>
      `,
            button: `
        <button style="
          background: #e0e5ec;
          box-shadow: 4px 4px 8px rgba(163, 177, 198, 0.6),
                      -4px -4px 8px rgba(255, 255, 255, 0.5);
          border: none;
          border-radius: 9999px;
          padding: 0.75rem 1.5rem;
          color: #333;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        ">
          {label}
        </button>
      `,
        },
    },
};
function getDesignSystem(name) {
    return exports.designSystems[name || 'glassmorphism'] || exports.designSystems.glassmorphism;
}
function getDesignSystemNames() {
    return Object.keys(exports.designSystems);
}
