// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginAdmin from './pages/LoginAdmin/LoginAdmin';
// ปรับให้ตรงกับชื่อ Component ที่ export ออกมา
import ListWellnessHub from './pages/ListWellnesshub/ListWellnesshub'; 

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LoginAdmin />} />
          {/* ตรวจสอบว่าในหน้า LoginAdmin สั่ง navigate มาที่ path นี้เป๊ะๆ หรือไม่ */}
          <Route path="/listWellnesshub" element={<ListWellnessHub />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;