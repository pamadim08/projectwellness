import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleUser,
  faClipboardCheck,
  faBuilding,
  faMapLocationDot,
  faFileCircleCheck,
  faClock,
  faSpinner,
  faTriangleExclamation,
  faRotate,
  faLocationDot,
  faArrowTrendUp,
  faChartPie,
} from "@fortawesome/free-solid-svg-icons";

import "./Dashboard.css";
import AdminSidebar from "../../Components/AdminSidebar/AdminSidebar";

const DASHBOARD_API = "http://localhost:8080/api/admin/dashboard";

let dashboardCache = null;

const CATEGORY_COLORS = {
  C01: "#2E9D62",
  C02: "#2563A6",
  C03: "#F28C28",
  C04: "#7C63D9",
  C05: "#28A9D8",
  EM01: "#E0A000",
  EM02: "#D9434E",
};

const FALLBACK_CATEGORY_COLORS = [
  "#64748B",
  "#0F766E",
  "#7C3AED",
  "#BE123C",
  "#0369A1",
  "#4D7C0F",
];

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
  wellnessHubsByCategory: [],
  wellnessHubsByDistrict: [],
};

function Dashboard() {
  const navigate = useNavigate();

  const [adminName, setAdminName] = useState("Admin");
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadDashboard = async (forceRefresh = false) => {
    if (dashboardCache && !forceRefresh) {
      setDashboard(dashboardCache);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    try {
      const response = await axios.get(DASHBOARD_API);
      const data = response.data || {};

      const normalizedData = {
        totalWellnessHubs: Number(data.totalWellnessHubs) || 0,
        totalMainRoutes: Number(data.totalMainRoutes) || 0,
        totalAccountRequests: Number(data.totalAccountRequests) || 0,
        pendingAccountRequests: Number(data.pendingAccountRequests) || 0,
        approvedAccountRequests: Number(data.approvedAccountRequests) || 0,
        rejectedAccountRequests: Number(data.rejectedAccountRequests) || 0,
        pendingPercentage: Number(data.pendingPercentage) || 0,
        approvedPercentage: Number(data.approvedPercentage) || 0,
        rejectedPercentage: Number(data.rejectedPercentage) || 0,
        wellnessHubsByCategory: Array.isArray(data.wellnessHubsByCategory)
          ? data.wellnessHubsByCategory
          : [],
        wellnessHubsByDistrict: Array.isArray(data.wellnessHubsByDistrict)
          ? data.wellnessHubsByDistrict
          : [],
      };

      dashboardCache = normalizedData;
      setDashboard(normalizedData);
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

  const categoryData = useMemo(() => {
    return [...dashboard.wellnessHubsByCategory]
      .map((category, index) => ({
        categoryId: category.categoryId,
        categoryName: category.categoryName || "ไม่ระบุหมวดหมู่",
        wellnessHubCount: Number(category.wellnessHubCount) || 0,
        percentage: Number(category.percentage) || 0,
        color:
          CATEGORY_COLORS[String(category.categoryId)] ||
          FALLBACK_CATEGORY_COLORS[index % FALLBACK_CATEGORY_COLORS.length],
      }))
      .sort(
        (first, second) => second.wellnessHubCount - first.wellnessHubCount,
      );
  }, [dashboard.wellnessHubsByCategory]);

  const districtData = useMemo(() => {
    return [...dashboard.wellnessHubsByDistrict]
      .map((district) => ({
        districtId: district.districtId,
        districtName: district.districtName || "ไม่ระบุอำเภอ",
        wellnessHubCount: Number(district.wellnessHubCount) || 0,
        categoryList: Array.isArray(district.categoryList)
          ? district.categoryList
              .map((category) => ({
                categoryId: category.categoryId,
                categoryName: category.categoryName || "ไม่ระบุหมวดหมู่",
                wellnessHubCount: Number(category.wellnessHubCount) || 0,
              }))
              .sort(
                (first, second) =>
                  second.wellnessHubCount - first.wellnessHubCount,
              )
          : [],
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

  const handleLogout = () => {
    dashboardCache = null;
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
      <AdminSidebar
        activeMenu="dashboard"
        pendingCount={dashboard.pendingAccountRequests}
      />

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
              onClick={() => loadDashboard(true)}
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
                <p>สรุปจำนวนและร้อยละของคำขอในแต่ละสถานะ</p>
              </div>

              <FontAwesomeIcon
                icon={faArrowTrendUp}
                className="section-heading-icon"
              />
            </div>

            <div
              className="request-number-panel"
              style={{
                width: "100%",
                boxSizing: "border-box",
              }}
            >
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
          </section>

          <section className="dashboard-section">
            <div className="dashboard-section-heading">
              <div>
                <span className="section-overline">
                  WELLNESS HUB CATEGORIES
                </span>
                <h2>สัดส่วนสถานประกอบการตามหมวดหมู่</h2>
                <p>
                  แสดงจำนวนและร้อยละของสถานประกอบการแต่ละประเภทจากทั้งหมดในระบบ
                </p>
              </div>

              <FontAwesomeIcon
                icon={faChartPie}
                className="section-heading-icon"
              />
            </div>

            {categoryData.length > 0 ? (
              <CategoryDistribution
                categories={categoryData}
                totalWellnessHubs={dashboard.totalWellnessHubs}
              />
            ) : (
              <div className="dashboard-empty">
                <FontAwesomeIcon icon={faChartPie} />
                <strong>ยังไม่มีข้อมูลสถานประกอบการตามหมวดหมู่</strong>
                <span>กรุณาตรวจสอบข้อมูลสถานประกอบการในระบบ</span>
              </div>
            )}
          </section>

          <section className="dashboard-section">
            <div className="dashboard-section-heading">
              <div>
                <span className="section-overline">
                  WELLNESS HUB DISTRIBUTION
                </span>
                <h2>จำนวนสถานประกอบการแยกตามอำเภอ</h2>
                <p>
                  เรียงจากอำเภอที่มีสถานประกอบการมากที่สุด
                  พร้อมรายละเอียดจำนวนในแต่ละหมวดหมู่
                </p>
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
                <span>กรุณาตรวจสอบข้อมูลอำเภอและสถานประกอบการในระบบ</span>
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

function CategoryDistribution({ categories, totalWellnessHubs }) {
  const centerX = 180;
  const centerY = 180;

  const radius = 92;
  const strokeWidth = 30;

  const circumference = 2 * Math.PI * radius;

  const lineStartRadius = radius + strokeWidth / 2 + 3;
  const lineMiddleRadius = radius + strokeWidth / 2 + 24;
  const lineEndDistance = 42;

  let accumulatedPercentage = 0;

  let lastRightY = -999;
  let lastLeftY = 999;

  const chartSegments = categories.map((category, index) => {
    const safePercentage = Math.min(
      100,
      Math.max(0, Number(category.percentage) || 0),
    );

    const startPercentage = accumulatedPercentage;
    const endPercentage = startPercentage + safePercentage;
    const middlePercentage = startPercentage + safePercentage / 2;

    accumulatedPercentage = endPercentage;

    const segmentLength = (safePercentage / 100) * circumference;
    const segmentOffset = (startPercentage / 100) * circumference;

    const angle = (middlePercentage / 100) * Math.PI * 2 - Math.PI / 2;

    const startX = centerX + Math.cos(angle) * lineStartRadius;
    const startY = centerY + Math.sin(angle) * lineStartRadius;

    let middleX = centerX + Math.cos(angle) * lineMiddleRadius;
    let middleY = centerY + Math.sin(angle) * lineMiddleRadius;

    const isRightSide = Math.cos(angle) >= 0;
    const minGap = 24;

    if (isRightSide) {
      if (lastRightY !== -999 && middleY - lastRightY < minGap) {
        middleY = lastRightY + minGap;
      }
      lastRightY = middleY;
    } else {
      if (lastLeftY !== 999 && lastLeftY - middleY < minGap) {
        middleY = lastLeftY - minGap;
      }
      lastLeftY = middleY;
    }

    const endX = middleX + (isRightSide ? lineEndDistance : -lineEndDistance);
    const endY = middleY;

    return {
      ...category,
      safePercentage,
      segmentLength,
      segmentOffset,
      startX,
      startY,
      middleX,
      middleY,
      endX,
      endY,
      isRightSide,
      animationDelay: index * 0.12,
    };
  });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(430px, 1fr) minmax(420px, 1.15fr)",
        gap: "50px",
        alignItems: "center",
        padding: "28px 30px 32px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "430px",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "430px",
            maxWidth: "100%",
          }}
        >
          <svg
            viewBox="0 0 360 360"
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              overflow: "visible",
            }}
            role="img"
            aria-label="กราฟวงกลมแสดงสัดส่วนสถานประกอบการตามหมวดหมู่"
          >
            <circle
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke="#edf1f4"
              strokeWidth={strokeWidth}
            />

            <g
              style={{
                transform: `rotate(-90deg)`,
                transformOrigin: `${centerX}px ${centerY}px`,
              }}
            >
              {chartSegments.map((category) => (
                <circle
                  key={`segment-${category.categoryId}`}
                  cx={centerX}
                  cy={centerY}
                  r={radius}
                  fill="none"
                  stroke={category.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${category.segmentLength} ${
                    circumference - category.segmentLength
                  }`}
                  strokeDashoffset={-category.segmentOffset}
                  strokeLinecap="butt"
                >
                  <animate
                    attributeName="stroke-dasharray"
                    from={`0 ${circumference}`}
                    to={`${category.segmentLength} ${
                      circumference - category.segmentLength
                    }`}
                    dur="0.9s"
                    begin={`${category.animationDelay}s`}
                    fill="freeze"
                    calcMode="spline"
                    keySplines="0.22 1 0.36 1"
                  />
                </circle>
              ))}
            </g>

            {chartSegments.map((category) => (
              <g key={`label-${category.categoryId}`} opacity="0">
                <polyline
                  points={`
                    ${category.startX},${category.startY}
                    ${category.middleX},${category.middleY}
                    ${category.endX},${category.endY}
                  `}
                  fill="none"
                  stroke={category.color}
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <circle
                  cx={category.startX}
                  cy={category.startY}
                  r="3"
                  fill={category.color}
                />

                <text
                  x={
                    category.isRightSide ? category.endX + 7 : category.endX - 7
                  }
                  y={category.endY + 5}
                  textAnchor={category.isRightSide ? "start" : "end"}
                  fill={category.color}
                  fontSize="14"
                  fontWeight="800"
                  fontFamily="'Sarabun', sans-serif"
                >
                  {category.safePercentage.toLocaleString("th-TH", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                  %
                </text>

                <animate
                  attributeName="opacity"
                  from="0"
                  to="1"
                  dur="0.45s"
                  begin={`${0.65 + category.animationDelay}s`}
                  fill="freeze"
                />
              </g>
            ))}

            <circle cx={centerX} cy={centerY} r="65" fill="#ffffff">
              <animate
                attributeName="r"
                from="54"
                to="65"
                dur="0.65s"
                begin="0.25s"
                fill="freeze"
                calcMode="spline"
                keySplines="0.22 1 0.36 1"
              />
            </circle>

            <g opacity="0">
              <text
                x={centerX}
                y={centerY - 1}
                textAnchor="middle"
                fill="#0f172a"
                fontSize="34"
                fontWeight="800"
                fontFamily="'Sarabun', sans-serif"
              >
                {Number(totalWellnessHubs || 0).toLocaleString("th-TH")}
              </text>

              <text
                x={centerX}
                y={centerY + 24}
                textAnchor="middle"
                fill="#64748b"
                fontSize="12"
                fontWeight="600"
                fontFamily="'Sarabun', sans-serif"
              >
                สถานประกอบการ
              </text>

              <animate
                attributeName="opacity"
                from="0"
                to="1"
                dur="0.5s"
                begin="0.55s"
                fill="freeze"
              />
            </g>
          </svg>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          minWidth: 0,
        }}
      >
        {categories.map((category, index) => (
          <div
            key={category.categoryId}
            style={{
              display: "grid",
              gridTemplateColumns: "12px minmax(0, 1fr) auto auto",
              gap: "14px",
              alignItems: "center",
              padding: "15px 4px",
              borderBottom:
                index < categories.length - 1 ? "1px solid #e2e8f0" : "none",
              opacity: 0,
              animation: `dashboardCategoryItemEnter 0.5s ease ${
                0.15 + index * 0.08
              }s forwards`,
            }}
          >
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: category.color,
                boxShadow: `0 0 0 4px ${category.color}12`,
              }}
            />

            <div
              style={{
                minWidth: 0,
              }}
            >
              <strong
                style={{
                  display: "block",
                  color: "#1e293b",
                  fontSize: "14px",
                  fontWeight: "800",
                }}
              >
                {category.categoryName}
              </strong>
            </div>

            <strong
              style={{
                color: "#334155",
                fontSize: "14px",
                whiteSpace: "nowrap",
              }}
            >
              {category.wellnessHubCount.toLocaleString("th-TH")} แห่ง
            </strong>

            <span
              style={{
                minWidth: "62px",
                color: category.color,
                textAlign: "right",
                fontSize: "14px",
                fontWeight: "800",
              }}
            >
              {category.percentage.toLocaleString("th-TH", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
              %
            </span>
          </div>
        ))}

        <style>
          {`
            @keyframes dashboardCategoryItemEnter {
              from {
                opacity: 0;
                transform: translateX(18px);
              }
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }
            @media (max-width: 1050px) {
              .admin-dashboard-page .dashboard-section {
                overflow: hidden;
              }
            }
          `}
        </style>
      </div>
    </div>
  );
}

function DistrictRow({ rank, district, maximumCount }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const barLevel =
    maximumCount > 0
      ? Math.max(
          4,
          Math.round((district.wellnessHubCount / maximumCount) * 100),
        )
      : 0;

  const handleToggleCategory = () => {
    setIsExpanded((previous) => !previous);
  };

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

        {district.categoryList.length > 0 && (
          <div
            style={{
              marginTop: "12px",
            }}
          >
            <button
              type="button"
              onClick={handleToggleCategory}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: 0,
                border: "none",
                background: "transparent",
                color: "#64748b",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              <i
                className={
                  isExpanded
                    ? "fa-solid fa-chevron-up"
                    : "fa-solid fa-chevron-down"
                }
              ></i>
              {isExpanded
                ? "ซ่อนรายละเอียดหมวดหมู่"
                : `ดูรายละเอียดหมวดหมู่ (${district.categoryList.length})`}
            </button>

            {isExpanded && (
              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "10px",
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                {district.categoryList.map((category, index) => {
                  const categoryColor =
                    CATEGORY_COLORS[String(category.categoryId)] ||
                    FALLBACK_CATEGORY_COLORS[
                      index % FALLBACK_CATEGORY_COLORS.length
                    ];

                  return (
                    <div
                      key={category.categoryId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "16px",
                        padding: "7px 4px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "9px",
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            flexShrink: 0,
                            borderRadius: "50%",
                            background: categoryColor,
                          }}
                        />

                        <span
                          style={{
                            color: "#475569",
                            fontSize: "13px",
                          }}
                        >
                          {category.categoryName}
                        </span>
                      </div>

                      <strong
                        style={{
                          color: categoryColor,
                          fontSize: "13px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {category.wellnessHubCount.toLocaleString("th-TH")} แห่ง
                      </strong>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default Dashboard;
