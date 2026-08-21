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
      <div className="navbar__top-line" />

      <div className="navbar__container">
        <div className="navbar__identity">
          <Link to="/" className="navbar__brand" onClick={closeMenu}>
            <div className="navbar__brand-mark">CM</div>

            <div className="navbar__brand-text">
              <span className="navbar__brand-title">CHIANG MAI</span>

              <span className="navbar__brand-subtitle">WELLNESS</span>
            </div>
          </Link>

          <div className="navbar__divider" />

          <div
            className="navbar__organizations"
            aria-label="หน่วยงานที่เกี่ยวข้อง"
          >
            <div className="navbar__organization-logo">
              <span>LOGO</span>
            </div>

            <div className="navbar__organization-logo">
              <span>LOGO</span>
            </div>

            <div className="navbar__organization-logo">
              <span>LOGO</span>
            </div>
          </div>
        </div>

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
