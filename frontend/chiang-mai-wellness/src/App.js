import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// ฝั่งผู้ใช้ทั่วไป
import Navbar from "./Components/Navbar/Navbar";
import Footer from "./Components/Footer/Footer";
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
import SearchResults from "./pages/SearchResults/SearchResults";
import WellnessHubDetail from "./pages/WellnessHubDetail/WellnessHubDetail";
import RequestWellnessHubAccount from "./pages/RequestWellnessHubAccount/RequestWellnessHubAccount";
import TrackAccountRequest from "./pages/TrackAccountRequest/TrackAccountRequest";
import RouteList from "./pages/RouteList/RouteList";
import ArticleList from "./pages/ArticleList/ArticleList";
import LoginWellnessHub from "./pages/LoginWellnessHub/LoginWellnessHub";
import ProviderDashboard from "./pages/ProviderDashboard/ProviderDashboard";
import ArticleDetail from "./pages/ArticleDetail/ArticleDetail";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [pathname]);

  return null;
}

function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}

function App() {
  return (
    <Router>
      <ScrollToTop />
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
         
          <Route
            path="/search"
            element={
              <PublicLayout>
                <SearchResults />
              </PublicLayout>
            }
          />
          <Route
            path="/wellness-hubs/:hubId"
            element={
              <PublicLayout>
                <WellnessHubDetail />
              </PublicLayout>
            }
          />
          <Route
            path="/request-wellness-hub-account"
            element={
              <PublicLayout>
                <RequestWellnessHubAccount />
              </PublicLayout>
            }
          />
          <Route
            path="/request-wellness-hub-account/:licenseId"
            element={
              <PublicLayout>
                <RequestWellnessHubAccount />
              </PublicLayout>
            }
          />
          <Route
            path="/wellness-routes"
            element={
              <PublicLayout>
                <RouteList />
              </PublicLayout>
            }
          />
          <Route
            path="/articles"
            element={
              <PublicLayout>
                <ArticleList />
              </PublicLayout>
            }
          />
          <Route
            path="/articles/:articleId"
            element={
              <PublicLayout>
                <ArticleDetail />
              </PublicLayout>
            }
          />  
          <Route
            path="/track-status"
            element={
              <PublicLayout>
                <TrackAccountRequest />
              </PublicLayout>
            }
          />
          {/* ฝั่งผู้ให้บริการ */}
          <Route path="/provider/login" element={<LoginWellnessHub />} />
          <Route path="/provider/dashboard" element={<ProviderDashboard />} />
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
