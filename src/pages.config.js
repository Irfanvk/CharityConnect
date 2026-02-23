/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AuditLogs from './pages/AuditLogs';
import Campaigns from './pages/Campaigns';
import Challans from './pages/Challans';
import Dashboard from './pages/Dashboard';
import Documentation from './pages/Documentation';
import Members from './pages/Members';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Register from './pages/Register';
import Reports from './pages/Reports';
// import Requests from './pages/Requests'; // Phase 1: Disabled - Will implement in Phase 2
import Settings from './pages/Settings';
import Login from './pages/Login';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AuditLogs": AuditLogs,
    "Campaigns": Campaigns,
    "Challans": Challans,
    "Dashboard": Dashboard,
    "Documentation": Documentation,
    "Members": Members,
    "Notifications": Notifications,
    "Profile": Profile,
    "Register": Register,
    "Reports": Reports,
    // "Requests": Requests, // Phase 1: Disabled - Will implement in Phase 2
    "Settings": Settings,
}

export const PUBLIC_PAGES = {
    "Login": Login,
    "Register": Register,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    PUBLIC_PAGES: PUBLIC_PAGES,
    Layout: __Layout,
};