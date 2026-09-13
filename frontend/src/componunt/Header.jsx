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
    <nav className="navbar navbar-expand-lg bg-white border-bottom shadow-sm sticky-top">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
          <span
            className="rounded-circle d-inline-flex align-items-center justify-content-center gap-2 me-2"
            style={{
              backgroundColor: '#4f46e5',
              color: 'white',
              width: '36px',
              height: '36px',
            }}
          >
            <i className="fa-solid fa-comment-dots" aria-hidden="true"></i>
          </span>
          <span className="fw-bold">AREACARE</span>
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
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className= {`nav-link  ${isActive('/')}`} to="/">
                Home
                <i className="fa-solid fa-home me-1"></i>
              </Link>
            </li>
            <li className="nav-item">
              <Link className= {`nav-link  ${isActive('/citizen/login')}`} to="/citizen/login">
                Citizen
                
                <i className="fa-solid fa-user me-1"></i>

              </Link>
            </li>
             <li className="nav-item">
              <Link className= {`nav-link  ${isActive('/staff login')}`} to="/stafflogin">
                Staff Login
                <i className="fa-solid fa-user me-1" > </i>
                
              </Link>
            </li>
             <li className="nav-item">
              <Link className= {`nav-link  ${isActive('/adminlogin')}`} to="/adminlogin">
                Admin login
                 <i className="fa-solid fa-shield-alt me-1"></i>
                
              </Link>
            </li>
          </ul>
        </div>
        <button className="theme-toggle" type="button" onClick={() => setIsDarkMode((currentMode) => !currentMode)} aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'} title={isDarkMode ? 'Light mode' : 'Dark mode'}>
          <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`} aria-hidden="true" />
          <span>{isDarkMode ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </nav>
  );
};

export default Header;

