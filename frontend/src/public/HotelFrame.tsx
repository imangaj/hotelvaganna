import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, Mail, Phone } from "lucide-react";
import LanguageSelector from "../components/LanguageSelector";
import { useLanguage } from "../contexts/LanguageContext";
import { hotelCopy } from "./hotelCopy";
import { hotelCompany } from "./hotelCompany";
import "./HotelExperience.css";

export const HotelFrame: React.FC<{ profile?: any; children: React.ReactNode }> = ({ profile, children }) => {
  const { language } = useLanguage();
  const t = hotelCopy[language];
  const location = useLocation();
  const title = profile?.contentJson?.i18n?.websiteTitle?.[language] || profile?.websiteTitle || profile?.name || "Hotel Valganna";
  const theme = { "--hotel-primary": profile?.primaryColor || "#244c40", "--hotel-accent": profile?.secondaryColor || "#b38a50" } as React.CSSProperties;
  return <div className="hotel-experience" style={theme}>
    <header className="hx-header">
      <Link to="/" className="hx-brand"><img src={profile?.logoUrl || "/logo-192.png"} alt="" /><span>{title}<small>MILANO</small></span></Link>
      <nav aria-label="Main navigation"><Link aria-current={location.pathname === "/" ? "page" : undefined} to="/">{t.home}</Link><Link aria-current={location.pathname.startsWith("/rooms") ? "page" : undefined} to="/rooms">{t.rooms}</Link><Link aria-current={location.pathname.startsWith("/guest") ? "page" : undefined} to="/guest">{t.account}</Link></nav>
      <div className="hx-header-actions"><LanguageSelector /><Link className="hx-button hx-small" to="/booking">{t.book}<ArrowUpRight size={16}/></Link></div>
    </header>
    {children}
    <footer className="hx-footer">
      <div className="hx-footer-main">
        <div><p className="hx-eyebrow">MILANO, ITALIA</p><h2>{title}</h2><p>{profile?.address || hotelCompany.registeredOffice}<br/>{profile?.city || "Milano"}{profile?.country ? " · " + profile.country : ""}</p></div>
        <div><h3>{t.contact}</h3>{profile?.phone && <a href={"tel:" + profile.phone.replace(/\s/g,"")}><Phone size={15}/>{profile.phone}</a>}<a href={"mailto:" + (profile?.email || "hotel.valganna@libero.it")}><Mail size={15}/>{profile?.email || "hotel.valganna@libero.it"}</a><Link to="/policies">{t.rules}</Link></div>
        <div><h3>{t.book}</h3><Link to="/rooms">{t.rooms}<ArrowUpRight size={15}/></Link><Link to="/booking">{t.search}<ArrowUpRight size={15}/></Link><Link to="/guest">{t.account}<ArrowUpRight size={15}/></Link></div>
      </div>
      <div className="hx-footer-legal"><span>© {new Date().getFullYear()} {hotelCompany.name}</span><span>P. IVA / C.F. {hotelCompany.vatNumber} · REA {hotelCompany.rea}{hotelCompany.cin ? " · CIN " + hotelCompany.cin : ""}{hotelCompany.cir ? " · CIR " + hotelCompany.cir : ""}</span></div>
    </footer>
  </div>;
};
export const RoomPhoto: React.FC<{ name?: string; src: string; className?: string; eager?: boolean }> = ({ name, src, className, eager }) =>
  <img src={src} alt={name || ""} className={className} loading={eager ? "eager" : "lazy"} onError={e => { if (!e.currentTarget.src.endsWith("/banner.png")) e.currentTarget.src = "/banner.png"; }} />;
