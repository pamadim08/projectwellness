// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// ฝั่งผู้ใช้ทั่วไป
import Navbar from "./Components/Navbar/Navbar";
import HomePage from "./pages/HomePage/HomePage";

// ฝั่งแอดมิน
import LoginAdmin from "./pages/LoginAdmin/LoginAdmin";
import ListWellnessHub from "./pages/ListWellnesshub/ListWellnesshub";
import AddWellnessHub from "./pages/CreateWellnesshub/AddWellnessHub";
import EditWellnessHub from "./pages/EditWellnesshub/EditWellnesshub";
import CreateMainRoute from "./pages/CreateMainRoute/CreateMainRoute";
import ListMainRoute from "./pages/ListMainroute/ListMainroute";
import CreateOfficialArticle from "./pages/CreateArticleOfficial/CreateOfficialArticle";
import ListOfficialArticle from "./pages/ListOfficialArticle/ListOfficialArticle";
import ListAccountRequest from "./pages/ListAccountRequest/ListAccountRequest";
import ApproveAccountRequest from "./pages/ApproveAccountRequest/ApproveAccountRequest";
import Dashboard from "./pages/Dashboard/Dashboard";
import RouteDetail from "./pages/RouteDetail/RouteDetail";

function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* ฝั่งผู้ใช้ทั่วไป */}
          <Route
            path="/"
            element={
              <PublicLayout>
                <HomePage />
              </PublicLayout>
            }
          />
          <Route
            path="/wellness-routes/:routeId"
            element={
              <PublicLayout>
                <RouteDetail />
              </PublicLayout>
            }
          />

          {/* ฝั่งแอดมิน */}
          <Route path="/login" element={<LoginAdmin />} />
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/listWellnesshub" element={<ListWellnessHub />} />

          <Route path="/add-wellness" element={<AddWellnessHub />} />

          <Route
            path="/listWellnesshub/edit/:id"
            element={<EditWellnessHub />}
          />

          <Route path="/createMainRoute" element={<CreateMainRoute />} />

          <Route path="/listMainRoute" element={<ListMainRoute />} />

          <Route path="/editMainRoute/:id" element={<CreateMainRoute />} />

          <Route
            path="/createOfficialArticle"
            element={<CreateOfficialArticle />}
          />

          <Route
            path="/listOfficialArticle"
            element={<ListOfficialArticle />}
          />

          <Route
            path="/editOfficialArticle/:id"
            element={<CreateOfficialArticle />}
          />

          <Route path="/listAccountRequest" element={<ListAccountRequest />} />

          <Route
            path="/account-requests/:id/approve"
            element={<ApproveAccountRequest />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
