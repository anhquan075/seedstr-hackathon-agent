import { getDesignSystemNames } from './design-system.js';
import { uiTemplates } from './ui-templates.js';
/**
 * Auto-select template based on job prompt keywords
 */
function selectTemplate(jobPrompt) {
    const prompt = jobPrompt.toLowerCase();
    // Landing page keywords
    if (prompt.match(/\b(landing|hero|homepage|marketing page|product page)\b/)) {
        if (prompt.includes('pricing'))
            return uiTemplates['landing-pricing-focus'];
        if (prompt.includes('feature'))
            return uiTemplates['landing-feature-showcase'];
        if (prompt.includes('testimonial'))
            return uiTemplates['landing-testimonial-heavy'];
        return uiTemplates['landing-hero-centric'];
    }
    // Dashboard keywords
    if (prompt.match(/\b(dashboard|admin|panel|analytics|metrics)\b/)) {
        if (prompt.includes('analytics') || prompt.includes('chart'))
            return uiTemplates['dashboard-analytics'];
        if (prompt.includes('crm'))
            return uiTemplates['dashboard-crm'];
        if (prompt.includes('project'))
            return uiTemplates['dashboard-project-management'];
        return uiTemplates['dashboard-admin-panel'];
    }
    // Ecommerce keywords
    if (prompt.match(/\b(ecommerce|shop|store|product|cart|checkout)\b/)) {
        if (prompt.includes('detail') || prompt.includes('single'))
            return uiTemplates['ecommerce-product-detail'];
        if (prompt.includes('cart'))
            return uiTemplates['ecommerce-cart'];
        if (prompt.includes('checkout'))
            return uiTemplates['ecommerce-checkout'];
        return uiTemplates['ecommerce-product-listing'];
    }
    // Portfolio keywords
    if (prompt.match(/\b(portfolio|showcase|work|projects)\b/)) {
        if (prompt.includes('design'))
            return uiTemplates['portfolio-designer'];
        if (prompt.includes('photo'))
            return uiTemplates['portfolio-photographer'];
        if (prompt.includes('agency'))
            return uiTemplates['portfolio-agency'];
        return uiTemplates['portfolio-developer'];
    }
    // Form keywords
    if (prompt.match(/\b(form|contact|signup|register|login|survey)\b/)) {
        if (prompt.includes('contact'))
            return uiTemplates['form-contact'];
        if (prompt.includes('survey'))
            return uiTemplates['form-survey'];
        return uiTemplates['form-signup'];
    }
    // Marketing keywords
    if (prompt.match(/\b(waitlist|coming soon|launch|event|trial|newsletter)\b/)) {
        if (prompt.includes('event') || prompt.includes('conference'))
            return uiTemplates['marketing-event'];
        return uiTemplates['marketing-waitlist'];
    }
    return null;
}
/**
 * Auto-select design system based on style keywords
 */
function selectDesignSystem(jobPrompt) {
    const prompt = jobPrompt.toLowerCase();
    if (prompt.match(/\b(glass|frosted|transparent|blur)\b/))
        return 'glassmorphism';
    if (prompt.match(/\b(brutal|bold|raw|stark|anti-design)\b/))
        return 'brutalism';
    if (prompt.match(/\b(cyber|neon|futuristic|tech|sci-fi)\b/))
        return 'cyberpunk';
    if (prompt.match(/\b(retro|vintage|70s|80s|90s)\b/))
        return 'retro';
    if (prompt.match(/\b(gradient|colorful|vibrant|dynamic)\b/))
        return 'gradientHeavy';
    if (prompt.match(/\b(material|google|modern)\b/))
        return 'material';
    if (prompt.match(/\b(minimal|clean|simple|minimalist)\b/))
        return 'minimalist';
    if (prompt.match(/\b(neomorph|soft|raised|shadow)\b/))
        return 'neumorphism';
    // Default to glassmorphism (most versatile)
    return 'glassmorphism';
}
export function getFrontendGenerationPrompt(jobPrompt) {
    const designSystems = getDesignSystemNames().join(', ');
    const selectedTemplate = selectTemplate(jobPrompt);
    const selectedDesignSystem = selectDesignSystem(jobPrompt);
    // Base prompt with template guidance
    let prompt = `You are an expert frontend developer creating a production-ready web application.

USER REQUEST:
${jobPrompt}

YOUR TASK:
Generate a complete, functional, production-ready frontend application that fulfills the user's request. The application MUST:

1. **Be Complete**: Include all HTML, CSS, and JavaScript needed to run standalone
2. **Be Beautiful**: Use modern design principles with attention to detail
3. **Be Functional**: All interactive elements must work properly
4. **Be Responsive**: Work perfectly on mobile, tablet, and desktop
5. **Be Accessible**: Follow WCAG guidelines for accessibility`;
    // Add template-specific guidance if matched
    if (selectedTemplate) {
        prompt += `

RECOMMENDED TEMPLATE: ${selectedTemplate.name}
${selectedTemplate.description}

TEMPLATE REQUIREMENTS:
${selectedTemplate.prompt}`;
    }
    prompt += `

DESIGN SYSTEM:
Use the '${selectedDesignSystem}' design system for consistent styling.`;
    if (selectedTemplate?.suggestedDesignSystems.length) {
        prompt += ` Alternative systems: ${selectedTemplate.suggestedDesignSystems.join(', ')}`;
    }
    prompt += `
Available design systems: ${designSystems}

TECHNICAL REQUIREMENTS:
- Single HTML file with embedded CSS and JavaScript
- Use modern CSS (flexbox, grid, custom properties)
- Use vanilla JavaScript (no frameworks unless specifically requested)
- Include proper meta tags, title, and favicon
- Mobile-first responsive design
- Smooth animations and transitions
- Proper error handling for user interactions

QUALITY STANDARDS:
- Clean, semantic HTML structure
- Well-organized CSS with consistent naming
- Modular, commented JavaScript
- No placeholder content - everything must be real and functional
- Attention to spacing, typography, and visual hierarchy

AVAILABLE TOOLS:
- web_search: Search the web for current information, APIs, or references
- calculator: Perform calculations if needed
- create_file: Create each file in the project (HTML, CSS, JS, assets)
- finalize_project: When done, finalize the project to create the deliverable ZIP
- generate_image: Generate AI images for placeholders or assets
- http_request: Make HTTP requests for API data or resources

WORKFLOW:
1. Analyze the user's request and plan the application structure
2. Search for any APIs or current information if needed
3. Create all necessary files (index.html, styles.css, script.js, etc.)
4. Test your logic mentally for any obvious errors
5. Call finalize_project when complete

OUTPUT REQUIREMENTS:
- Start with index.html as the entry point
- Create additional files as needed (CSS, JS, assets)
- Ensure all file references are correct
- The final ZIP should be ready to unzip and open in a browser

Remember: This will be evaluated by AI judges on functionality, design quality, and speed. Prioritize clean execution over clever tricks.`;
    return prompt;
}
export function getToolInstructions() {
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
export function getSystemPrompt() {
    return `You are an autonomous AI agent specialized in creating high-quality frontend applications.

You have access to multiple tools to help you complete tasks:
- web_search: Search the web for information
- calculator: Perform calculations
- create_file: Create project files
- finalize_project: Complete the project and create deliverable

You operate in steps:
1. Understand the request
2. Plan your approach
3. Use tools to gather information if needed
4. Create the application files
5. Finalize the project

Always strive for production quality:
- Clean, semantic code
- Beautiful, responsive design
- Full functionality
- Proper error handling
- Attention to detail

Think step by step and use tools effectively to create the best possible result.`;
}
//# sourceMappingURL=prompts.js.map