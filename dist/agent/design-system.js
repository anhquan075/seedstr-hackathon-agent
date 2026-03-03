/**
 * Pre-baked design systems to reduce LLM output variance
 * Each system includes tokens and component templates
 */
export const designSystems = {
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
    brutalism: {
        name: 'brutalism',
        tokens: {
            colors: {
                primary: '#000000',
                secondary: '#ffffff',
                accent: '#ff0000',
                background: '#ffffff',
                foreground: '#000000',
                muted: '#666666',
            },
            spacing: {
                xs: '0.5rem',
                sm: '1rem',
                md: '2rem',
                lg: '3rem',
                xl: '4rem',
            },
            typography: {
                fontFamily: "'Space Mono', monospace",
                fontSize: {
                    xs: '0.875rem',
                    sm: '1rem',
                    base: '1.125rem',
                    lg: '1.5rem',
                    xl: '2rem',
                    '2xl': '3rem',
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
          background: #ffffff;
          border: 4px solid #000000;
          padding: 2rem;
          box-shadow: 8px 8px 0 #000000;
        ">
          {content}
        </div>
      `,
            button: `
        <button style="
          background: #000000;
          border: 4px solid #000000;
          padding: 1rem 2rem;
          color: white;
          font-weight: 700;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 4px 4px 0 #ff0000;
          transition: transform 0.1s;
        ">
          {label}
        </button>
      `,
        },
    },
    cyberpunk: {
        name: 'cyberpunk',
        tokens: {
            colors: {
                primary: '#00ffff',
                secondary: '#ff00ff',
                accent: '#ffff00',
                background: '#0a0a0a',
                foreground: '#ffffff',
                muted: '#666666',
            },
            spacing: {
                xs: '0.5rem',
                sm: '1rem',
                md: '1.5rem',
                lg: '2.5rem',
                xl: '4rem',
            },
            typography: {
                fontFamily: "'Orbitron', 'Exo 2', sans-serif",
                fontSize: {
                    xs: '0.75rem',
                    sm: '0.875rem',
                    base: '1rem',
                    lg: '1.25rem',
                    xl: '1.75rem',
                    '2xl': '2.5rem',
                },
            },
            radius: {
                sm: '0.25rem',
                md: '0.5rem',
                lg: '1rem',
                full: '9999px',
            },
        },
        templates: {
            card: `
        <div style="
          background: rgba(0, 255, 255, 0.05);
          border: 1px solid #00ffff;
          border-radius: 0.5rem;
          padding: 1.5rem;
          box-shadow: 0 0 20px rgba(0, 255, 255, 0.3),
                      inset 0 0 20px rgba(0, 255, 255, 0.05);
        ">
          {content}
        </div>
      `,
            button: `
        <button style="
          background: linear-gradient(135deg, #00ffff 0%, #ff00ff 100%);
          border: 1px solid #00ffff;
          border-radius: 0.25rem;
          padding: 0.75rem 1.5rem;
          color: #0a0a0a;
          font-weight: 700;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
          transition: all 0.3s;
        ">
          {label}
        </button>
      `,
        },
    },
    retro: {
        name: 'retro',
        tokens: {
            colors: {
                primary: '#ff6b6b',
                secondary: '#4ecdc4',
                accent: '#ffe66d',
                background: '#f7f1e3',
                foreground: '#2c3e50',
                muted: '#95a5a6',
            },
            spacing: {
                xs: '0.5rem',
                sm: '1rem',
                md: '1.5rem',
                lg: '2rem',
                xl: '3rem',
            },
            typography: {
                fontFamily: "'Abril Fatface', 'Merriweather', serif",
                fontSize: {
                    xs: '0.875rem',
                    sm: '1rem',
                    base: '1.125rem',
                    lg: '1.5rem',
                    xl: '2rem',
                    '2xl': '3rem',
                },
            },
            radius: {
                sm: '1rem',
                md: '1.5rem',
                lg: '2rem',
                full: '9999px',
            },
        },
        templates: {
            card: `
        <div style="
          background: linear-gradient(135deg, #fff5e1 0%, #ffe4e1 100%);
          border: 3px solid #ff6b6b;
          border-radius: 1.5rem;
          padding: 1.5rem;
          box-shadow: 5px 5px 0 #4ecdc4;
        ">
          {content}
        </div>
      `,
            button: `
        <button style="
          background: #ff6b6b;
          border: 3px solid #2c3e50;
          border-radius: 9999px;
          padding: 0.75rem 2rem;
          color: white;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 3px 3px 0 #ffe66d;
          transition: transform 0.2s;
        ">
          {label}
        </button>
      `,
        },
    },
    'gradient-heavy': {
        name: 'gradient-heavy',
        tokens: {
            colors: {
                primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                secondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                accent: '#ffd700',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                foreground: '#ffffff',
                muted: 'rgba(255, 255, 255, 0.7)',
            },
            spacing: {
                xs: '0.5rem',
                sm: '1rem',
                md: '1.5rem',
                lg: '2rem',
                xl: '3rem',
            },
            typography: {
                fontFamily: "'Outfit', 'Inter', sans-serif",
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
                sm: '0.5rem',
                md: '1rem',
                lg: '1.5rem',
                full: '9999px',
            },
        },
        templates: {
            card: `
        <div style="
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 9999px;
          padding: 0.75rem 1.5rem;
          color: white;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          transition: all 0.3s;
        ">
          {label}
        </button>
      `,
        },
    },
    material: {
        name: 'material',
        tokens: {
            colors: {
                primary: '#6200ee',
                secondary: '#03dac6',
                accent: '#ff0266',
                background: '#ffffff',
                foreground: '#000000',
                muted: '#757575',
            },
            spacing: {
                xs: '0.5rem',
                sm: '1rem',
                md: '1.5rem',
                lg: '2rem',
                xl: '2.5rem',
            },
            typography: {
                fontFamily: "'Roboto', system-ui, sans-serif",
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
          background: #ffffff;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12),
                      0 1px 2px rgba(0, 0, 0, 0.24);
          transition: box-shadow 0.3s;
        ">
          {content}
        </div>
      `,
            button: `
        <button style="
          background: #6200ee;
          border: none;
          border-radius: 0.5rem;
          padding: 0.75rem 1.5rem;
          color: white;
          font-weight: 500;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(98, 0, 238, 0.3);
          transition: box-shadow 0.3s;
        ">
          {label}
        </button>
      `,
        },
    },
};
export function getDesignSystem(name) {
    return designSystems[name || 'glassmorphism'] || designSystems.glassmorphism;
}
export function getDesignSystemNames() {
    return Object.keys(designSystems);
}
//# sourceMappingURL=design-system.js.map