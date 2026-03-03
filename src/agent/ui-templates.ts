export const uiTemplates = {
  'landing-hero-centric': {
    name: 'Hero-Centric Landing Page',
    description: 'Modern landing page with large hero section',
    prompt: `Create a modern landing page with:
- Full-viewport hero section with gradient background
- Clear headline and subheadline
- Primary CTA button (prominent)
- Feature section with 3-4 cards
- Social proof section (logos or testimonials)
- Footer with links
Use semantic HTML5, mobile-responsive CSS, smooth scroll behavior.`,
    suggestedDesignSystems: ['glassmorphism', 'gradient-heavy', 'material'],
  },
  'landing-feature-showcase': {
    name: 'Feature Showcase Landing Page',
    description: 'Landing page focused on product features',
    prompt: `Create a feature showcase landing page with:
- Sticky navigation bar with logo and CTA
- Hero section with product mockup/image
- Alternating left/right feature blocks (image on one side, text on other)
- Grid of smaller features with icons
- Final CTA section at the bottom
- Simple footer
Ensure high contrast and clear typography.`,
    suggestedDesignSystems: ['minimalist', 'material', 'neumorphism'],
  },
  'landing-pricing-focus': {
    name: 'Pricing-Focused Landing Page',
    description: 'Landing page centered around pricing tiers',
    prompt: `Create a pricing-focused landing page with:
- Brief hero section explaining value proposition
- 3-tier pricing cards (Basic, Pro, Enterprise)
- Highlight the middle "Pro" tier visually
- Feature comparison table below pricing
- FAQ accordion section
- Trust badges/logos
Make pricing cards stand out with shadows or borders.`,
    suggestedDesignSystems: ['brutalism', 'material', 'glassmorphism'],
  },
  'landing-testimonial-heavy': {
    name: 'Testimonial-Heavy Landing Page',
    description: 'Landing page driven by social proof',
    prompt: `Create a testimonial-heavy landing page with:
- Hero section featuring a strong customer quote
- Masonry grid of customer reviews/tweets
- Video testimonial placeholder section
- "As seen on" logo strip
- Clear CTA to join the community
- Footer with social links
Use warm colors and rounded corners for a friendly feel.`,
    suggestedDesignSystems: ['retro', 'neumorphism', 'minimalist'],
  },
  'dashboard-analytics': {
    name: 'Analytics Dashboard',
    description: 'Data-heavy dashboard with charts and metrics',
    prompt: `Create an analytics dashboard with:
- Sidebar navigation (collapsible on mobile)
- Top header with user profile and search
- 4 key metric cards at the top (revenue, users, etc.)
- Large main chart area (line/bar chart placeholder)
- Secondary chart areas (pie/doughnut placeholders)
- Recent activity table
Use a clean, data-focused layout with subtle borders.`,
    suggestedDesignSystems: ['material', 'minimalist', 'glassmorphism'],
  },
  'dashboard-admin-panel': {
    name: 'Admin Panel',
    description: 'Control center for managing users and settings',
    prompt: `Create an admin panel dashboard with:
- Left sidebar with multi-level menu items
- Breadcrumb navigation in header
- Data table with pagination, search, and filter controls
- Action buttons (Edit, Delete, View) in table rows
- Status badges (Active, Pending, Error)
- Modal/Dialog placeholder for quick edits
Ensure high usability and clear visual hierarchy.`,
    suggestedDesignSystems: ['material', 'minimalist', 'brutalism'],
  },
  'dashboard-crm': {
    name: 'CRM Dashboard',
    description: 'Customer relationship management interface',
    prompt: `Create a CRM dashboard with:
- Kanban board layout for sales pipeline
- Draggable card placeholders for deals/contacts
- Contact detail sidebar (slides in from right)
- Activity timeline feed
- Quick add button for new contacts/deals
- Task reminder list
Use distinct colors for different pipeline stages.`,
    suggestedDesignSystems: ['neumorphism', 'material', 'retro'],
  },
  'dashboard-project-management': {
    name: 'Project Management Dashboard',
    description: 'Task and project tracking interface',
    prompt: `Create a project management dashboard with:
- Project overview header with progress bar
- Team member avatars (overlapping)
- List view of tasks with assignees and due dates
- Calendar/Timeline view placeholder
- File attachments section
- Comments/Discussion thread area
Focus on collaboration features and clear status indicators.`,
    suggestedDesignSystems: ['glassmorphism', 'gradient-heavy', 'minimalist'],
  },
  'ecommerce-product-listing': {
    name: 'Product Listing Page',
    description: 'Grid of products with filters',
    prompt: `Create an ecommerce product listing page with:
- Top navigation with cart icon and search bar
- Left sidebar for filters (categories, price, rating)
- Active filter tags area
- Responsive grid of product cards
- Product cards must have: image, title, price, rating, and "Add to Cart" button
- Pagination controls at the bottom
Ensure images maintain aspect ratio.`,
    suggestedDesignSystems: ['minimalist', 'material', 'brutalism'],
  },
  'ecommerce-product-detail': {
    name: 'Product Detail Page',
    description: 'Single product view with gallery and buy options',
    prompt: `Create an ecommerce product detail page with:
- Image gallery (large main image, thumbnail strip below)
- Product title, price, and review summary
- Variant selectors (color swatches, size buttons)
- Quantity input and large "Add to Cart" CTA
- Expandable sections for Description, Details, Shipping
- "Related Products" carousel at the bottom
Focus on high-quality imagery and clear purchasing actions.`,
    suggestedDesignSystems: ['minimalist', 'material', 'retro'],
  },
  'ecommerce-cart': {
    name: 'Shopping Cart',
    description: 'Cart review page before checkout',
    prompt: `Create a shopping cart page with:
- List of cart items (image, name, variant, price)
- Quantity adjusters for each item
- Remove item buttons
- Order summary sidebar (subtotal, tax, shipping, total)
- Promo code input field
- Prominent "Proceed to Checkout" button
- "Continue Shopping" link
Make the order summary sticky on desktop.`,
    suggestedDesignSystems: ['material', 'neumorphism', 'minimalist'],
  },
  'ecommerce-checkout': {
    name: 'Checkout Flow',
    description: 'Multi-step or single-page checkout',
    prompt: `Create a checkout page with:
- Minimal header (no distracting links)
- Two-column layout (form on left, order summary on right)
- Shipping address form with validation states
- Shipping method selection (radio buttons)
- Payment method selection (Credit Card, PayPal, etc.)
- Secure payment badges
- "Place Order" final CTA
Ensure form fields are large and easy to tap on mobile.`,
    suggestedDesignSystems: ['minimalist', 'material', 'glassmorphism'],
  },
  'portfolio-photographer': {
    name: 'Photographer Portfolio',
    description: 'Image-heavy portfolio for visual artists',
    prompt: `Create a photographer portfolio with:
- Minimalist header with logo and simple menu
- Full-screen image slider or masonry grid hero
- Categorized gallery (Weddings, Portraits, Nature)
- Lightbox/modal view for full-size images
- About me section with photo
- Contact form for bookings
Let the images take center stage with minimal UI chrome.`,
    suggestedDesignSystems: ['minimalist', 'brutalism', 'retro'],
  },
  'portfolio-developer': {
    name: 'Developer Portfolio',
    description: 'Tech-focused portfolio for software engineers',
    prompt: `Create a developer portfolio with:
- Terminal-style or tech-themed hero section
- Skills/Technologies grid with icons
- Featured projects section (cards with screenshot, description, tech stack tags, github/live links)
- GitHub contribution graph placeholder
- Experience/Education timeline
- Links to resume and social profiles
Use monospace fonts and code-like aesthetics.`,
    suggestedDesignSystems: ['cyberpunk', 'brutalism', 'material'],
  },
  'portfolio-designer': {
    name: 'Designer Portfolio',
    description: 'Creative portfolio for UI/UX designers',
    prompt: `Create a designer portfolio with:
- Bold, typography-driven hero section
- Large, high-quality case study thumbnails
- Hover effects on project cards (reveal title/tags)
- Detailed case study layout (problem, process, solution)
- Dribbble/Behance feed integration placeholder
- Creative footer design
Focus on unique layouts, smooth animations, and perfect typography.`,
    suggestedDesignSystems: ['brutalism', 'gradient-heavy', 'glassmorphism'],
  },
  'portfolio-agency': {
    name: 'Agency Portfolio',
    description: 'Professional portfolio for creative agencies',
    prompt: `Create an agency portfolio with:
- Video background hero section
- Client logo marquee (infinite scroll)
- Services offered section with custom icons
- Featured work carousel
- Team members grid
- "Start a project" prominent CTA
Use a polished, corporate but creative aesthetic.`,
    suggestedDesignSystems: ['material', 'gradient-heavy', 'neumorphism'],
  },
  'form-contact': {
    name: 'Contact Form',
    description: 'Standard contact us page',
    prompt: `Create a contact page with:
- Split layout (contact info on left, form on right)
- Office location map placeholder
- Form fields: Name, Email, Subject, Message
- Floating labels for inputs
- Custom styled select dropdown for "Inquiry Type"
- Submit button with loading state
- Success message placeholder
Ensure clear focus states and error validation styling.`,
    suggestedDesignSystems: ['material', 'glassmorphism', 'minimalist'],
  },
  'form-signup': {
    name: 'Sign Up / Login',
    description: 'Authentication pages',
    prompt: `Create a signup/login page with:
- Centered card layout on a decorative background
- Social login buttons (Google, GitHub, etc.) with icons
- Divider with "or" text
- Email and password fields
- Password strength indicator
- "Remember me" checkbox and "Forgot password" link
- Toggle between Sign Up and Log In states
Make it feel secure and trustworthy.`,
    suggestedDesignSystems: ['glassmorphism', 'neumorphism', 'material'],
  },
  'form-survey': {
    name: 'Survey / Questionnaire',
    description: 'Interactive survey form',
    prompt: `Create a survey form with:
- Progress bar at the top
- One question per screen layout
- Large, clickable option cards (radio button alternatives)
- Rating scale (1-10) component
- Emoji feedback selector
- "Next" and "Previous" navigation buttons
Focus on micro-interactions and making the form feel engaging.`,
    suggestedDesignSystems: ['gradient-heavy', 'retro', 'material'],
  },
  'marketing-waitlist': {
    name: 'Waitlist Page',
    description: 'Viral waitlist for upcoming product',
    prompt: `Create a viral waitlist page with:
- Bold, intriguing headline
- Email input with inline submit button
- Current position/queue number display
- "Share to move up" section with social buttons
- Gamification elements (points, rewards for referring)
- Animated background or 3D element placeholder
Create a sense of exclusivity and urgency.`,
    suggestedDesignSystems: ['cyberpunk', 'gradient-heavy', 'brutalism'],
  },
  'marketing-event': {
    name: 'Event Registration',
    description: 'Landing page for webinars or conferences',
    prompt: `Create an event registration page with:
- Hero section with event date, time, and location
- Countdown timer to the event
- Speaker grid with photos and bios
- Schedule/Agenda timeline
- Ticket pricing tiers
- Sticky "Register Now" bar on mobile
Use energetic colors and clear hierarchy.`,
    suggestedDesignSystems: ['gradient-heavy', 'material', 'retro'],
  }
};

export function getTemplate(id: string) {
  return uiTemplates[id as keyof typeof uiTemplates];
}

export function getAllTemplates() {
  return Object.entries(uiTemplates).map(([id, template]) => ({
    id,
    ...template
  }));
}
