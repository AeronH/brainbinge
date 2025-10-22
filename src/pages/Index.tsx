import { useLocation } from "react-router-dom";
import Dashboard from "./Dashboard";
import CreateLesson from "./CreateLesson";
import LessonView from "./LessonView";

const Index = () => {
  const location = useLocation();

  if (location.pathname === "/create-lesson") {
    return <CreateLesson />;
  }

  if (location.pathname.startsWith("/lesson/")) {
    return <LessonView />;
  }

  return <Dashboard />;
};

export default Index;
