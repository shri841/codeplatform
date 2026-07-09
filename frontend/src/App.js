import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import StudentSignup from './pages/StudentSignup';
import FacultySignup from './pages/FacultySignup';
import AdminDashboard from './pages/AdminDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import StudentDashboard from './pages/StudentDashboard';
import SolveQuestion from './pages/SolveQuestion';

function App() {
  return (
    <AuthProvider>
      <Navbar />
      <main className="page-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup/student" element={<StudentSignup />} />
          <Route path="/signup/faculty" element={<FacultySignup />} />

          <Route path="/admin" element={
            <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/faculty" element={
            <ProtectedRoute role="faculty"><FacultyDashboard /></ProtectedRoute>
          } />
          <Route path="/student" element={
            <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
          } />
          <Route path="/student/solve/:id" element={
            <ProtectedRoute role="student"><SolveQuestion /></ProtectedRoute>
          } />
        </Routes>
      </main>
    </AuthProvider>
  );
}

export default App;
