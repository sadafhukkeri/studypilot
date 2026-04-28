import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import StudySetPage from "@/pages/StudySetPage";
import NotesPage from "@/pages/NotesPage";
import FlashcardsPage from "@/pages/FlashcardsPage";
import QuizPage from "@/pages/QuizPage";
import SparkChatPage from "@/pages/SparkChatPage";
import ArcadePage from "@/pages/ArcadePage";
import ArcadeGamePage from "@/pages/ArcadeGamePage";
import CalendarPage from "@/pages/CalendarPage";
import StudySetsListPage from "@/pages/StudySetsListPage";
import SettingsPage from "@/pages/SettingsPage";

function AppRouter() {
  const location = useLocation();
  // Synchronous detection of OAuth callback hash
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/study-sets" element={<ProtectedRoute><StudySetsListPage /></ProtectedRoute>} />
      <Route path="/study-set/:id" element={<ProtectedRoute><StudySetPage /></ProtectedRoute>} />
      <Route path="/study-set/:id/notes" element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
      <Route path="/study-set/:id/flashcards" element={<ProtectedRoute><FlashcardsPage /></ProtectedRoute>} />
      <Route path="/study-set/:id/quiz" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
      <Route path="/study-set/:id/chat" element={<ProtectedRoute><SparkChatPage /></ProtectedRoute>} />
      <Route path="/sparke" element={<ProtectedRoute><SparkChatPage /></ProtectedRoute>} />
      <Route path="/arcade" element={<ProtectedRoute><ArcadePage /></ProtectedRoute>} />
      <Route path="/arcade/play/:setId/:mode" element={<ProtectedRoute><ArcadeGamePage /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
          <Toaster theme="dark" position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
