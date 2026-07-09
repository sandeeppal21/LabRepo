import { Link } from "react-router-dom";
import { FaDna, FaHeart, FaRegHeart } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="ls-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <Link to="/" className="ls-logo">
            <div className="logo-icon"><FaDna /></div>
            Lab<span>Repo</span>
          </Link>
          <p>
            Modern Laboratory Information System for pathology labs of all sizes across India.
          </p>
        </div>

        <div className="footer-col">
          <h4>Product</h4>
          <ul>
            <li><a href="#features">Features</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#how">How It Works</a></li>
            <li><a href="#report">Report Download</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Support</h4>
          <ul>
            <li><a href="#">Documentation</a></li>
            <li><a href="#">Video Tutorials</a></li>
            <li><a href="#">Contact Us</a></li>
            <li><a href="#">System Status</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Legal</h4>
          <ul>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Terms of Service</a></li>
            <li><a href="#">Data Security</a></li>
            <li><a href="#">HIPAA Compliance</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} LabSmart LIS. All rights reserved.</span>
        <span>
          Made with <FaRegHeart /> for Indian Pathology Labs
        </span>
      </div>
    </footer>
  );
}