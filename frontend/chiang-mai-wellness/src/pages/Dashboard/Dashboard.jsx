import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShieldHeart,
  faCircleUser,
  faChartPie,
  faClipboardCheck,
  faRoute,
  faShop,
  faNewspaper,
  faRightFromBracket,
  faBuilding,
  faMapLocationDot,
  faFileCircleCheck,
  faClock,
  faCircleCheck,
  faCircleXmark,
  faSpinner,
  faTriangleExclamation,
  faRotate,
  faLocationDot,
  faArrowTrendUp,
} from "@fortawesome/free-solid-svg-icons";

import "./Dashboard.css";

const DASHBOARD_API = "http://localhost:8080/api/admin/dashboard";

const EMPTY_DASHBOARD = {
  totalWellnessHubs: 0,
  totalMainRoutes: 0,
  totalAccountRequests: 0,
  pendingAccountRequests: 0,
  approvedAccountRequests: 0,
  rejectedAccountRequests: 0,
  pendingPercentage: 0,
  approvedPercentage: 0,
  rejectedPercentage: 0,
  wellnessHubsByDistrict: [],
};

function Dashboard() {
  const navigate = useNavigate();

  const [adminName, setAdminName] = useState("Admin");
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadDashboard = async () => {
    setIsLoading(true);
    setHasError(false);

    try {
      const response = await axios.get(DASHBOARD_API);
      const data = response.data || {};

      setDashboard({
        totalWellnessHubs: Number(data.totalWellnessHubs) || 0,

        totalMainRoutes: Number(data.totalMainRoutes) || 0,

        totalAccountRequests: Number(data.totalAccountRequests) || 0,

        pendingAccountRequests: Number(data.pendingAccountRequests) || 0,

        approvedAccountRequests: Number(data.approvedAccountRequests) || 0,

        rejectedAccountRequests: Number(data.rejectedAccountRequests) || 0,

        pendingPercentage: Number(data.pendingPercentage) || 0,

        approvedPercentage: Number(data.approvedPercentage) || 0,

        rejectedPercentage: Number(data.rejectedPercentage) || 0,

        wellnessHubsByDistrict: Array.isArray(data.wellnessHubsByDistrict)
          ? data.wellnessHubsByDistrict
          : [],
      });
    } catch (error) {
      console.error("ไม่สามารถโหลดข้อมูล Dashboard ได้", error);

      setDashboard(EMPTY_DASHBOARD);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const storedAdminName = localStorage.getItem("adminName");

    if (storedAdminName) {
      setAdminName(storedAdminName);
    }

    loadDashboard();
  }, []);

  const districtData = useMemo(() => {
    return [...dashboard.wellnessHubsByDistrict]
      .map((district) => ({
        districtId: district.districtId,
        districtName: district.districtName || "ไม่ระบุอำเภอ",
        wellnessHubCount: Number(district.wellnessHubCount) || 0,
      }))
      .sort(
        (first, second) => second.wellnessHubCount - first.wellnessHubCount,
      );
  }, [dashboard.wellnessHubsByDistrict]);

  const maximumDistrictCount = useMemo(() => {
    if (districtData.length === 0) {
      return 0;
    }

    return Math.max(
      ...districtData.map((district) => district.wellnessHubCount),
    );
  }, [districtData]);

  const formatNumber = (value) => {
    return Number(value || 0).toLocaleString("th-TH");
  };

  const formatPercentage = (value) => {
    const numberValue = Number(value) || 0;

    return numberValue.toLocaleString("th-TH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading-page">
        <div className="dashboard-loading-box">
          <FontAwesomeIcon icon={faSpinner} spin />

          <h2>กำลังโหลดข้อมูล Dashboard</h2>
          <p>กรุณารอสักครู่...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-page">
      <nav className="sidebar-menu">
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <FontAwesomeIcon icon={faShieldHeart} />
            <span>Admin Panel</span>
          </div>

          <div className="user-profile-box">
            <FontAwesomeIcon icon={faCircleUser} />

            <div className="user-info">
              <span className="user-label">ผู้ใช้งานปัจจุบัน:</span>

              <span className="user-name">{adminName}</span>
            </div>
          </div>

          <p className="menu-label">เมนูหลัก</p>

          <Link to="/dashboard" className="menu-item active">
            <i className="fa-solid fa-chart-pie"></i> แผงควบคุมหลัก
          </Link>
          <Link to="/listAccountRequest" className="menu-item">
            <i className="fa-solid fa-clipboard-check"></i> ตรวจสอบคำขอสิทธิ์
            <span className="badge-counter">5</span>
          </Link>

          <p className="menu-label" style={{ marginTop: "20px" }}>
            การจัดการข้อมูล
          </p>
          <Link to="/listMainRoute" className="menu-item">
            <i className="fa-solid fa-route"></i> จัดการเส้นทางสุขภาพ
          </Link>
          <Link to="/listWellnessHub" className="menu-item">
            <i className="fa-solid fa-shop"></i> จัดการสถานประกอบการ
          </Link>
          <Link to="/listOfficialArticle" className="menu-item">
            <i className="fa-solid fa-newspaper"></i> จัดการบทความ
          </Link>
        </div>

        <button
          type="button"
          className="btn-sidebar-logout"
          onClick={handleLogout}
        >
          <FontAwesomeIcon icon={faRightFromBracket} />
          ออกจากระบบ
        </button>
      </nav>

      <main className="dashboard-main">
        <div className="dashboard-container">
          <header className="dashboard-header">
            <div>
              <span className="dashboard-header-label">ภาพรวมระบบ</span>

              <h1>แผงควบคุมผู้ดูแลระบบ</h1>

              <p>สรุปข้อมูลเส้นทางสุขภาพ สถานประกอบการ และคำขอใช้งานระบบ</p>
            </div>

            <button
              type="button"
              className="dashboard-refresh-button"
              onClick={loadDashboard}
            >
              <FontAwesomeIcon icon={faRotate} />
              อัปเดตข้อมูล
            </button>
          </header>

          {hasError && (
            <div className="dashboard-error">
              <FontAwesomeIcon icon={faTriangleExclamation} />

              <div>
                <strong>ไม่สามารถโหลดข้อมูล Dashboard ได้</strong>

                <span>กรุณาตรวจสอบ Backend และลองใหม่อีกครั้ง</span>
              </div>
            </div>
          )}

          <section className="dashboard-summary-grid">
            <SummaryCard
              title="สถานประกอบการทั้งหมด"
              value={formatNumber(dashboard.totalWellnessHubs)}
              unit="แห่ง"
              description="สถานประกอบการที่บันทึกในระบบ"
              icon={faBuilding}
              cardClass="summary-card-primary"
              delayClass="animation-delay-1"
            />

            <SummaryCard
              title="เส้นทางสุขภาพทั้งหมด"
              value={formatNumber(dashboard.totalMainRoutes)}
              unit="เส้นทาง"
              description="เส้นทางท่องเที่ยวเชิงสุขภาพ"
              icon={faMapLocationDot}
              cardClass="summary-card-route"
              delayClass="animation-delay-2"
            />

            <SummaryCard
              title="คำขอเปิดบัญชีทั้งหมด"
              value={formatNumber(dashboard.totalAccountRequests)}
              unit="คำขอ"
              description="คำขอที่เข้าสู่ระบบทั้งหมด"
              icon={faFileCircleCheck}
              cardClass="summary-card-request"
              delayClass="animation-delay-3"
            />

            <SummaryCard
              title="รอการตรวจสอบ"
              value={formatNumber(dashboard.pendingAccountRequests)}
              unit="คำขอ"
              description="รายการที่ผู้ดูแลระบบต้องดำเนินการ"
              icon={faClock}
              cardClass="summary-card-pending"
              delayClass="animation-delay-4"
            />
          </section>

          <section className="dashboard-section">
            <div className="dashboard-section-heading">
              <div>
                <span className="section-overline">ACCOUNT REQUESTS</span>

                <h2>ภาพรวมสถานะคำขอเปิดบัญชี</h2>

                <p>แสดงสัดส่วนคำขออนุมัติ ไม่อนุมัติ และคำขอที่รอพิจารณา</p>
              </div>

              <FontAwesomeIcon
                icon={faArrowTrendUp}
                className="section-heading-icon"
              />
            </div>

            <div className="request-overview-layout">
              <div className="percentage-chart-grid">
                <PercentageCircle
                  title="อนุมัติ"
                  value={dashboard.approvedPercentage}
                  amount={dashboard.approvedAccountRequests}
                  icon={faCircleCheck}
                  type="approved"
                />

                <PercentageCircle
                  title="ไม่อนุมัติ"
                  value={dashboard.rejectedPercentage}
                  amount={dashboard.rejectedAccountRequests}
                  icon={faCircleXmark}
                  type="rejected"
                />

                <PercentageCircle
                  title="รอพิจารณา"
                  value={dashboard.pendingPercentage}
                  amount={dashboard.pendingAccountRequests}
                  icon={faClock}
                  type="pending"
                />
              </div>

              <div className="request-number-panel">
                <div className="request-number-header">
                  <div>
                    <span>จำนวนคำขอทั้งหมด</span>

                    <strong>
                      {formatNumber(dashboard.totalAccountRequests)}
                    </strong>
                  </div>

                  <FontAwesomeIcon icon={faClipboardCheck} />
                </div>

                <RequestStatusRow
                  title="อนุมัติแล้ว"
                  value={dashboard.approvedAccountRequests}
                  percentage={dashboard.approvedPercentage}
                  type="approved"
                />

                <RequestStatusRow
                  title="ไม่อนุมัติ"
                  value={dashboard.rejectedAccountRequests}
                  percentage={dashboard.rejectedPercentage}
                  type="rejected"
                />

                <RequestStatusRow
                  title="รอการตรวจสอบ"
                  value={dashboard.pendingAccountRequests}
                  percentage={dashboard.pendingPercentage}
                  type="pending"
                />
              </div>
            </div>
          </section>

          <section className="dashboard-section">
            <div className="dashboard-section-heading">
              <div>
                <span className="section-overline">
                  WELLNESS HUB DISTRIBUTION
                </span>

                <h2>จำนวนสถานประกอบการแยกตามอำเภอ</h2>

                <p>เรียงลำดับจากอำเภอที่มี สถานประกอบการมากที่สุด</p>
              </div>

              <FontAwesomeIcon
                icon={faLocationDot}
                className="section-heading-icon"
              />
            </div>

            {districtData.length > 0 ? (
              <div className="district-list">
                {districtData.map((district, index) => (
                  <DistrictRow
                    key={district.districtId ?? district.districtName}
                    rank={index + 1}
                    district={district}
                    maximumCount={maximumDistrictCount}
                  />
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <FontAwesomeIcon icon={faLocationDot} />

                <strong>ยังไม่มีข้อมูลสถานประกอบการรายอำเภอ</strong>

                <span>กรุณาตรวจสอบข้อมูลอำเภอและ สถานประกอบการในระบบ</span>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  unit,
  description,
  icon,
  cardClass,
  delayClass,
}) {
  return (
    <article className={`dashboard-summary-card ${cardClass} ${delayClass}`}>
      <div className="summary-card-top">
        <div className="summary-card-icon">
          <FontAwesomeIcon icon={icon} />
        </div>

        <span className="summary-card-label">{title}</span>
      </div>

      <div className="summary-card-value-row">
        <strong>{value}</strong>
        <span>{unit}</span>
      </div>

      <p>{description}</p>
    </article>
  );
}

function PercentageCircle({ title, value, amount, icon, type }) {
  const safePercentage = Math.min(100, Math.max(0, Number(value) || 0));

  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  const progressOffset = circumference - (safePercentage / 100) * circumference;

  return (
    <article className={`percentage-card percentage-card-${type}`}>
      <div className="percentage-circle-wrapper">
        <svg
          className="percentage-circle"
          viewBox="0 0 140 140"
          aria-label={`${title} ${safePercentage}%`}
        >
          <circle
            className="percentage-circle-background"
            cx="70"
            cy="70"
            r={radius}
          />

          <circle
            className="percentage-circle-progress"
            cx="70"
            cy="70"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
          />
        </svg>

        <div className="percentage-circle-value">
          <strong>
            {safePercentage.toLocaleString("th-TH", {
              maximumFractionDigits: 2,
            })}
          </strong>

          <span>%</span>
        </div>
      </div>

      <div className="percentage-card-detail">
        <div className="percentage-card-title">
          <FontAwesomeIcon icon={icon} />
          <h3>{title}</h3>
        </div>

        <p>
          จำนวน <strong>{Number(amount || 0).toLocaleString("th-TH")}</strong>{" "}
          คำขอ
        </p>
      </div>
    </article>
  );
}

function RequestStatusRow({ title, value, percentage, type }) {
  const safePercentage = Math.min(100, Math.max(0, Number(percentage) || 0));

  return (
    <div className={`request-status-row request-status-${type}`}>
      <div className="request-status-information">
        <div>
          <span className="request-status-dot" />
          <strong>{title}</strong>
        </div>

        <span>{Number(value || 0).toLocaleString("th-TH")} คำขอ</span>
      </div>

      <div className="request-progress-track">
        <div
          className="request-progress-value"
          data-percentage={Math.round(safePercentage)}
        />
      </div>

      <span className="request-status-percentage">
        {safePercentage.toLocaleString("th-TH", {
          maximumFractionDigits: 2,
        })}
        %
      </span>
    </div>
  );
}

function DistrictRow({ rank, district, maximumCount }) {
  const barLevel =
    maximumCount > 0
      ? Math.max(
          4,
          Math.round((district.wellnessHubCount / maximumCount) * 100),
        )
      : 0;

  return (
    <article className="district-row">
      <div className="district-rank">{rank}</div>

      <div className="district-information">
        <div className="district-title-row">
          <div>
            <FontAwesomeIcon icon={faLocationDot} />

            <strong>อำเภอ{district.districtName}</strong>
          </div>

          <span>
            <strong>{district.wellnessHubCount.toLocaleString("th-TH")}</strong>{" "}
            แห่ง
          </span>
        </div>

        <div className="district-progress-track">
          <div className="district-progress-value" data-level={barLevel} />
        </div>
      </div>
    </article>
  );
}

export default Dashboard;
