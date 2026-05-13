import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import "./ListWellnesshub.css";

const ListWellnessHub = () => {
  const [listwellnesshub, setListWellnessHub] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("http://localhost:8080/api/wellness-hubs");
      setListWellnessHub(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setListWellnessHub([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    return listwellnesshub.filter((hub) => {
      // ปรับเป็น wellnessHubName ตามตัวแปรใน Java
      const name = hub?.wellnessHubName?.toLowerCase() ?? "";
      return name.includes(searchQuery.toLowerCase());
    });
  }, [listwellnesshub, searchQuery]);

  return (
    <div className="gov-container">
      <header className="gov-header">
        <h2>บัญชีรายชื่อสถานประกอบการ (List Wellness Hub)</h2>
        <p>ระบบบริหารจัดการข้อมูลสุขภาพ จังหวัดเชียงใหม่</p>
      </header>

      <div className="gov-filter-bar">
        <input
          type="text"
          className="gov-input"
          style={{ flex: 1 }}
          placeholder="ระบุชื่อสถานประกอบการเพื่อค้นหา..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button className="btn-gov-search" onClick={loadData}>
          รีเฟรชข้อมูล
        </button>
      </div>

      <div className="gov-table-container">
        <table className="list-table">
          <thead>
            <tr>
              <th width="5%">ลำดับ</th>
              <th width="35%">ชื่อสถานประกอบการ</th>
              <th width="20%">หมวดหมู่</th>
              <th width="20%">อำเภอ</th>
              <th width="20%">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>กำลังโหลดข้อมูล...</td>
              </tr>
            ) : filteredData.length > 0 ? (
              filteredData.map((hub, index) => (
                <tr key={hub.licenseId ?? index}>
                  <td style={{ textAlign: "center" }}>{index + 1}</td>
                  {/* เปลี่ยนจาก hub.name เป็น hub.wellnessHubName */}
                  <td><strong>{hub.wellnessHubName ?? "ไม่ระบุชื่อ"}</strong></td>
                  
                  {/* ดึงชื่อหมวดหมู่จาก Object Category */}
                  <td>{hub.category?.categoryName ?? "-"}</td>
                  
                  {/* ดึงชื่ออำเภอจาก Object District */}
                  <td style={{ textAlign: "center" }}>
                    {hub.district?.districtName ?? "-"}
                  </td>

                  <td style={{ textAlign: "center" }}>
                    <span
                      className="status-text"
                      style={{ color: hub.status === "active" ? "#1c7430" : "#c82333" }}
                    >
                      {hub.status === "active" ? "[ เปิดใช้งาน ]" : "[ ระงับการใช้งาน ]"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>
                  ไม่พบข้อมูลสถานประกอบการในระบบ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListWellnessHub;