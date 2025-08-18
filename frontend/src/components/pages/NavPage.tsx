import { Outlet } from "react-router-dom";
import Navbar from "../Navbar";
import Footer from "../Footer";

function NavPages() {
  return (
    <>
      <Navbar />
      <main className="flex-grow">
        <Outlet /> {/* Page content will be injected here */}
      </main>
      <Footer />
    </>
  );
}

export default NavPages;
