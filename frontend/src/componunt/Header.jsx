import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation()
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('areacare-theme') === 'dark')

  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode)
    localStorage.setItem('areacare-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

    const isActive = (path) => {
       return location.pathname === path ? "active text-primary fw-semibold" : "";
    }
  return (
    <nav className="navbar navbar-expand-lg bg-white border-bottom shadow-sm sticky-top areacare-nav">
      <div className="container-fluid px-4">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
          <span
            className="nav-logo-icon rounded-circle d-inline-flex align-items-center justify-content-center"
            style={{ backgroundColor: '#4f46e5', color: 'white' }}
          >
            <i className="fa-solid fa-comment-dots" aria-hidden="true" />
          </span>
          <span className="nav-brand-text fw-bold">AREACARE</span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent"
          aria-controls="navbarSupportedContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center gap-lg-1">
            <li className="nav-item">
              <Link className={`nav-link areacare-nav-link ${isActive('/')}`} to="/">
                <i className="fa-solid fa-house" aria-hidden="true" /> Home
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link areacare-nav-link ${isActive('/citizen/login')}`} to="/citizen/login">
                <i className="fa-solid fa-user" aria-hidden="true" /> Citizen
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link areacare-nav-link ${isActive('/stafflogin')}`} to="/stafflogin">
                <i className="fa-solid fa-id-badge" aria-hidden="true" /> Staff Login
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link areacare-nav-link ${isActive('/adminlogin')}`} to="/adminlogin">
                <i className="fa-solid fa-shield-alt" aria-hidden="true" /> Admin Login
              </Link>
            </li>
          </ul>
        </div>

        <button
          className="theme-toggle"
          type="button"
          onClick={() => setIsDarkMode((m) => !m)}
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDarkMode ? 'Light mode' : 'Dark mode'}
        >
          <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`} aria-hidden="true" />
          <span>{isDarkMode ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </nav>
  );
};

export default Header;

