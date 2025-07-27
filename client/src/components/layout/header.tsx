import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/components/ui/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Menu, Search, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { LoginModal } from "@/components/auth/login-modal";
import { RegisterModal } from "@/components/auth/register-modal";
import { SubmitStoryModal } from "@/components/story/submit-story-modal";

/**
 * ShadowNews Header Component
 * 
 * The main navigation header that appears on every page. Provides:
 * 
 * 1. Branding and navigation
 *    - ShadowNews logo/wordmark
 *    - Primary navigation links (Top, New, Ask, Show, Jobs)
 *    - Active link highlighting
 * 
 * 2. User functionality
 *    - Search functionality (placeholder for future implementation)
 *    - Dark/light theme toggle
 *    - Authentication modals (login/register)
 *    - User menu when authenticated
 * 
 * 3. Responsive design
 *    - Mobile hamburger menu
 *    - Adaptive layout for different screen sizes
 *    - Auto-closes mobile menu on navigation
 * 
 * The header adapts its content based on authentication state and
 * provides quick access to core application features.
 */
export function Header() {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  
  // Component state for UI interactions
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  /**
   * Toggle mobile menu visibility
   */
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  /**
   * Toggle between light and dark themes
   */
  const toggleDarkMode = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  /**
   * Handle search form submission
   * TODO: Implement actual search functionality
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder for search implementation
    console.log("Searching for:", searchQuery);
  };

  /**
   * Primary navigation links configuration
   * Matches Hacker News-style navigation structure
   */
  const navLinks = [
    { href: "/", label: "Top" },
    { href: "/new", label: "New" },
    { href: "/best", label: "Best" },
    { href: "/ask", label: "Ask" },
    { href: "/show", label: "Show" },
    { href: "/jobs", label: "Jobs" },
  ];

  /**
   * Auto-close mobile menu when user navigates to a new page
   * Improves mobile UX by hiding the menu after selection
   */
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  return (
    <>
      <header className="bg-white dark:bg-secondary shadow-md transition-dark">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center">
                <span className="text-primary dark:text-primary font-bold text-2xl tracking-tight">
                  Shadow<span className="text-secondary dark:text-white">News</span>
                </span>
              </Link>
              <nav className="hidden md:flex space-x-6">
                {navLinks.map((link) => (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    className={`text-darkText dark:text-lightText hover:text-primary dark:hover:text-primary text-sm font-medium transition-dark ${location === link.href ? 'text-primary' : ''}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search component */}
              <form onSubmit={handleSearch} className="relative hidden md:block">
                <Input
                  type="text"
                  placeholder="Search stories..."
                  className="w-64 px-4 py-1 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button 
                  type="submit" 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-0 top-0 h-full"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </form>
              
              {/* Dark mode toggle */}
              <div className="flex items-center space-x-2">
                <Switch 
                  id="dark-mode" 
                  checked={theme === "dark"} 
                  onCheckedChange={toggleDarkMode} 
                />
                <Label htmlFor="dark-mode" className="text-sm">Dark</Label>
              </div>
              
              {/* User menu or auth buttons */}
              <div className="flex items-center space-x-4">
                {user ? (
                  <div className="flex items-center space-x-3">
                    <Link 
                      href={`/user/${user.id}`}
                      className="text-sm font-medium hover:text-primary transition-dark"
                    >
                      {user.username}
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSubmitModalOpen(true)}
                    >
                      Submit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={logout}
                    >
                      Logout
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setLoginModalOpen(true)}
                    >
                      Login
                    </Button>
                    <Button 
                      onClick={() => setRegisterModalOpen(true)}
                    >
                      Sign Up
                    </Button>
                  </>
                )}
              </div>
              
              {/* Mobile menu button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden" 
                onClick={toggleMobileMenu}
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-3">
                {navLinks.map((link) => (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    className={`block px-3 py-2 rounded-md text-base font-medium text-darkText dark:text-lightText hover:bg-gray-100 dark:hover:bg-gray-700 transition-dark ${location === link.href ? 'text-primary' : ''}`}
                  >
                    {link.label}
                  </Link>
                ))}
                <form onSubmit={handleSearch} className="mt-3">
                  <Input
                    type="text"
                    placeholder="Search stories..."
                    className="w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </form>
              </div>
            </div>
          )}
        </div>
      </header>

      <LoginModal 
        isOpen={loginModalOpen} 
        onClose={() => setLoginModalOpen(false)} 
        onSwitchToRegister={() => {
          setLoginModalOpen(false);
          setRegisterModalOpen(true);
        }}
      />

      <RegisterModal 
        isOpen={registerModalOpen} 
        onClose={() => setRegisterModalOpen(false)} 
        onSwitchToLogin={() => {
          setRegisterModalOpen(false);
          setLoginModalOpen(true);
        }}
      />

      <SubmitStoryModal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
      />
    </>
  );
}
