import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    {
      path: "/",
      label: "หน้าแรก",
      end: true,
    },
    {
      path: "/wellness-routes",
      label: "เส้นทางท่องเที่ยว",
    },

    {
      path: "/articles",
      label: "บทความ",
    },

    {
      path: "/track-status",
      label: "ติดตามสถานะคำขอ",
    },
  ];

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="navbar">
      <div className="navbar__container">
        <Link to="/" className="navbar__brand" onClick={closeMenu}>
          <div className="navbar__logo" aria-hidden="true">
            ☘
          </div>

          <div className="navbar__brand-text">
            <span className="navbar__brand-title">CHIANG MAI</span>

            <span className="navbar__brand-subtitle">WELLNESS</span>
          </div>
        </Link>

        <nav
          className={`navbar__menu ${isMenuOpen ? "navbar__menu--open" : ""}`}
          aria-label="เมนูหลัก"
        >
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                isActive ? "navbar__link navbar__link--active" : "navbar__link"
              }
              onClick={closeMenu}
            >
              {item.label}
            </NavLink>
          ))}

          <Link
            to="/provider/login"
            className="navbar__login-button"
            onClick={closeMenu}
          >
            <span aria-hidden="true">♙</span>
            เข้าสู่ระบบ
          </Link>
        </nav>

        <button
          type="button"
          className="navbar__toggle"
          aria-label={isMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((previous) => !previous)}
        >
          <span
            className={`navbar__toggle-line ${
              isMenuOpen ? "navbar__toggle-line--first" : ""
            }`}
          />

          <span
            className={`navbar__toggle-line ${
              isMenuOpen ? "navbar__toggle-line--second" : ""
            }`}
          />

          <span
            className={`navbar__toggle-line ${
              isMenuOpen ? "navbar__toggle-line--third" : ""
            }`}
          />
        </button>
      </div>
    </header>
  );
}

export default Navbar;
