import { HiHome, HiSearch, HiInformationCircle } from "react-icons/hi"
import { IoMdPerson } from "react-icons/io"
import { Link } from 'react-router-dom'
import NavItem from './NavItem'
import logo from '../assets/logo.png'

function Navbar() {
  const menu = [
    {
      name: "Home",
      icon: HiHome,
      path: "/"
    },
    {
      name: "About",
      icon: HiInformationCircle,
      path: "/about"
    },
    {
      name: "Registration/Login",
      icon: IoMdPerson,
      path: "/registration"
    },
    {
      name: "Search",
      icon: HiSearch,
      path: "/search"
    },
  ];

  return (
     <div className="flex items-center justify-between w-full px-4 py-2 bg-white shadow">
      <Link to="/">
        <img src={logo} className="w-[80px] md:w-[115px] object-cover" alt="Logo" />
      </Link>
      <div className="flex gap-7">
        {menu.map((item) => (
          <Link key={item.name} to={item.path}>
            <NavItem name={item.name} Icon={item.icon} />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Navbar;
