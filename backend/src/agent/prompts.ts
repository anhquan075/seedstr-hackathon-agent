import { getDesignSystemNames } from './design-system.js';
import { uiTemplates } from './ui-templates.js';

/**
 * Auto-select template based on job prompt keywords
 */
function selectTemplate(jobPrompt: string) {
  const prompt = jobPrompt.toLowerCase();
  
  // Landing page keywords
  if (prompt.match(/\b(landing|hero|homepage|marketing page|product page)\b/)) {
    if (prompt.includes('pricing')) return uiTemplates['landing-pricing-focus'];
    if (prompt.includes('feature')) return uiTemplates['landing-feature-showcase'];
    if (prompt.includes('testimonial')) return uiTemplates['landing-testimonial-heavy'];
    return uiTemplates['landing-hero-centric'];
  }
  
  // Dashboard keywords
  if (prompt.match(/\b(dashboard|admin|panel|analytics|metrics)\b/)) {
    if (prompt.includes('analytics') || prompt.includes('chart')) return uiTemplates['dashboard-analytics'];
    if (prompt.includes('crm')) return uiTemplates['dashboard-crm'];
    if (prompt.includes('project')) return uiTemplates['dashboard-project-management'];
    return uiTemplates['dashboard-admin-panel'];
  }
  
  // Ecommerce keywords
  if (prompt.match(/\b(ecommerce|shop|store|product|cart|checkout)\b/)) {
    if (prompt.includes('detail') || prompt.includes('single')) return uiTemplates['ecommerce-product-detail'];
    if (prompt.includes('cart')) return uiTemplates['ecommerce-cart'];
    if (prompt.includes('checkout')) return uiTemplates['ecommerce-checkout'];
    return uiTemplates['ecommerce-product-listing'];
  }
  
  // Portfolio keywords
  if (prompt.match(/\b(portfolio|showcase|work|projects)\b/)) {
    if (prompt.includes('design')) return uiTemplates['portfolio-designer'];
    if (prompt.includes('photo')) return uiTemplates['portfolio-photographer'];
    if (prompt.includes('agency')) return uiTemplates['portfolio-agency'];
    return uiTemplates['portfolio-developer'];
  }
  
  // Form keywords
  if (prompt.match(/\b(form|contact|signup|register|login|survey)\b/)) {
    if (prompt.includes('contact')) return uiTemplates['form-contact'];
    if (prompt.includes('survey')) return uiTemplates['form-survey'];
    return uiTemplates['form-signup'];
  }
  
  // Marketing keywords
  if (prompt.match(/\b(waitlist|coming soon|launch|event|trial|newsletter)\b/)) {
    if (prompt.includes('event') || prompt.includes('conference')) return uiTemplates['marketing-event'];
    return uiTemplates['marketing-waitlist'];
  }
  
  return null;
}

/**
 * Auto-select design system based on style keywords
 */
function selectDesignSystem(jobPrompt: string): string {
  const prompt = jobPrompt.toLowerCase();
  
  if (prompt.match(/\b(glass|frosted|transparent|blur)\b/)) return 'glassmorphism';
  if (prompt.match(/\b(brutal|bold|raw|stark|anti-design)\b/)) return 'brutalism';
  if (prompt.match(/\b(cyber|neon|futuristic|tech|sci-fi)\b/)) return 'cyberpunk';
  if (prompt.match(/\b(retro|vintage|70s|80s|90s)\b/)) return 'retro';
  if (prompt.match(/\b(gradient|colorful|vibrant|dynamic)\b/)) return 'gradientHeavy';
  if (prompt.match(/\b(material|google|modern)\b/)) return 'material';
  if (prompt.match(/\b(minimal|clean|simple|minimalist)\b/)) return 'minimalist';
  if (prompt.match(/\b(neomorph|soft|raised|shadow)\b/)) return 'neumorphism';
  
  // Default to glassmorphism (most versatile)
  return 'glassmorphism';
}

export function getFrontendGenerationPrompt(jobPrompt: string): string {
  const designSystems = getDesignSystemNames().join(', ');
  const selectedTemplate = selectTemplate(jobPrompt);
  const selectedDesignSystem = selectDesignSystem(jobPrompt);
  
  return `### TASK SPECIFICATION:
${jobPrompt}

### ARCHITECTURAL DIRECTIVE:
Generate a complete, production-ready web application using the '${selectedDesignSystem}' design system.

### TECHNICAL REQUIREMENTS:
1. **Multi-File Structure**: SEPARATE index.html, styles.css, and script.js (minimum).
2. **Modern Standards**: Use semantic HTML5 (header, main, section, footer), Flexbox/Grid, and Vanilla ES6+ JS.
3. **Accessibility (A11y)**: Every image MUST have alt text. Every interactive element MUST have an aria-label. Use high-contrast colors.
4. **Performance**: All JS must be deferred. Minimize re-paints. Use CSS transitions for animations.
5. **Responsive Design**: Mobile-first approach. Ensure it looks perfect on all screens.
6. **Interactive Polish**: Add hover states, active states, and subtle entry animations.
7. **No Placeholders**: Every image description, text block, and button must be contextual and functional.

### PROJECT CONTEXT:
- **Template Baseline**: ${selectedTemplate ? selectedTemplate.name : 'Custom Build'}
- **Style Guide**: ${selectedDesignSystem} (Available: ${designSystems})

### IMPLEMENTATION STEPS:
1. **HTML Structure**: Semantic tags, meta tags, and correct file links.
2. **CSS Styling**: Variable-driven, responsive, and organized.
3. **JS Logic**: Error-handled, modular, and performant.

**CRITICAL**: Link CSS with <link rel="stylesheet" href="styles.css"> and JS with <script src="script.js" defer></script>.
Wait for tool feedback after every file creation. Do not assume success.`;
}

export function getToolInstructions(): string {
  return `
TOOL USAGE INSTRUCTIONS:

1. web_search(query: string)
   - Use to find current information, APIs, documentation
   - Example: web_search("latest weather API free")
   - Returns: Search results with URLs and snippets

2. calculator(expression: string)
   - Use to perform calculations
   - Example: calculator("(100 * 1.08) + 25")
   - Returns: Numeric result

3. create_file(path: string, content: string)
   - Use to create each file in the project
   - Example: create_file("index.html", "<html>...</html>")
   - Path should be relative (e.g., "index.html", "css/style.css")

4. finalize_project()
   - Call when all files are created
   - Creates ZIP file for submission
   - Only call this once, after all files are ready

IMPORTANT:
- Call tools one at a time, waiting for results
- Check tool results before proceeding
- If a tool fails, try again or use alternative approach
- Always finalize_project when done
`;
}

export function getSystemPrompt(agentInfo?: { name?: string; bio?: string; skills?: string[] }): string {
  const identity = agentInfo?.name ? `You are ${agentInfo.name}${agentInfo.bio ? `. ${agentInfo.bio}` : ''}` : 'You are Prometheus, a world-class Autonomous Full-Stack AI Engineer specializing in high-performance web applications.';
  const skillsContext = agentInfo?.skills?.length ? `\nYour specialized skills include: ${agentInfo.skills.join(', ')}.` : '';

  return `${identity}${skillsContext}
Your mission is to deliver "judge-winning" solutions that are technically flawless, visually stunning, and highly performant.

### OPERATIONAL PROTOCOL:
1. **Analyze & Decompose**: Break down the user request into core functional requirements and edge cases.
2. **Strategic Planning**: Before using any tools, think step-by-step and create a mental blueprint.
3. **Execution Excellence**: Use tools surgically. Create modular, well-commented code.
4. **Self-Correction**: If a tool fails or the validator reports an error, analyze the root cause and fix it immediately.

### ENGINEERING STANDARDS:
- **Clean Architecture**: Separation of concerns (HTML/CSS/JS). Modular functions.
- **Visual Polish**: Professional typography, consistent spacing, smooth transitions.
- **Resilience**: Implement error boundaries, loading states, and responsive design.
- **Validation**: Every project MUST include a 'TESTING.md' explaining how to verify functionality and a basic 'tests/smoke.test.js' file.
- **Performance**: Minimize assets, use efficient DOM manipulation.

You have access to:
- web_search: Research APIs/Docs.
- calculator: Handle complex numeric logic.
- create_file: Build the project file-by-file.
- finalize_project: Deliver the final verified package.

**Final Goal**: Win the competition by exceeding the AI Judge's expectations for code quality and UI/UX.`;
}
