import Header from './componunt/Header.jsx'
import { Route, Routes } from 'react-router-dom'
import AdminLogin from './page/admin_login.jsx'
import AdminDashboard from './page/AdminDashboard.jsx'
import StaffLogin from './page/stafflogin.jsx'
import StaffRegistration from './page/staffragistratio.jsx'
import Citizen from './page/Citizen.jsx'
import StaffDashboard from './page/StaffDashboard.jsx'
import CitizenHome from './page/CitizenHome.jsx'
import Homepage from './page/Homepage.jsx'
import CitizenTrack from './page/CitizenTrack.jsx'
import CitizenLogin from './page/CitizenLogin.jsx'
import StaffComplaintDetail from './page/StaffComplaintDetail.jsx'
import AuthGuard from './auth/AuthGuard.jsx'

function App() {
  

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/adminlogin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AuthGuard role="admin"><AdminDashboard /></AuthGuard>} />
        <Route path="/admin/Dashboard" element={<AuthGuard role="admin"><AdminDashboard /></AuthGuard>} />
        <Route path="/stafflogin" element={<StaffLogin />} />
        <Route path="/register-staff" element={<StaffRegistration />} />
        <Route path="/staff/dashboard" element={<AuthGuard role="staff"><StaffDashboard /></AuthGuard>} />
        <Route path="/staff/complaints/:complaintId" element={<AuthGuard role="staff"><StaffComplaintDetail /></AuthGuard>} />
        <Route path="/Citizen" element={<Citizen />} />
        <Route path="/citizen" element={<CitizenLogin />} />
        <Route path="/citizen/home" element={<CitizenHome />} />
        <Route path="/citizen/complaint" element={<Citizen />} />
        <Route path="/citizen/track" element={<CitizenTrack />} />
        <Route path="/citizen/login" element={<CitizenLogin />} />
      </Routes>
      </>
  )


     
}

export default App
