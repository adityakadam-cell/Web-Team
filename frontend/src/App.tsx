import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar       from "@/components/Navbar";
import CustomCursor from "@/components/CustomCursor";
import Home         from "@/pages/Home";
import AuditWizard  from "@/pages/tools/AuditWizard";
import Optimizer    from "@/pages/tools/Optimizer";
import PageCloner   from "@/pages/tools/PageCloner";
import GitHubPush   from "@/pages/tools/GitHubPush";

export default function App() {
  return (
    <BrowserRouter>
      <CustomCursor />
      <Navbar />
      <Routes>
        <Route path="/"          element={<Home />}        />
        <Route path="/audit"     element={<AuditWizard />} />
        <Route path="/optimizer" element={<Optimizer />}   />
        <Route path="/cloner"    element={<PageCloner />}  />
        <Route path="/github"    element={<GitHubPush />}  />
      </Routes>
    </BrowserRouter>
  );
}
