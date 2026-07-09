import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { FaDna, FaArrowRight } from "react-icons/fa";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (


    <nav className="ls-nav scrolled">
      <Link to="/" className="ls-logo">
        <div className="logo-icon"><FaDna /></div>
        Lab<span style={{ color: "#00d4ff" }}>Repo</span>
      </Link>

      <ul className="nav-links">
        <li><a href="#features">Features</a></li>
        <li><a href="#how">How It Works</a></li>
        <li><a href="#report">Get Report</a></li>
        <li><a href="#pricing">Pricing</a></li>
      </ul>

      <div className="nav-cta">
        <Link to="/login" className="btn-outline">Login</Link>

        <Link to="/register" className="btn-primary">
          Register <FaArrowRight />
        </Link>
      </div>
    </nav>
  );
}