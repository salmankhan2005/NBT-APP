"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight, Phone } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "About Us", href: "/about" },
    { name: "Services", href: "/services" },
    { name: "Business Details", href: "/compliance" },
    { name: "Contact", href: "/contact" },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-surface shadow-level2">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-white font-bold">
                B
              </span>
              <span className="font-bold text-lg tracking-tight text-primary">
                New Balaji Transports
              </span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-body-sm font-semibold transition-colors hover:text-secondary ${
                  isActive(link.href) ? "text-secondary border-b-2 border-secondary pb-1" : "text-primary/80"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/tracking"
              className="text-body-sm font-semibold text-primary/80 hover:text-secondary transition-colors"
            >
              Track Shipment
            </Link>
            <Link
              href="/contact?quote=true"
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-button bg-secondary text-white font-semibold text-body-sm hover:bg-secondary/90 transition-colors shadow-level2"
            >
              Get a Quote
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-primary/80 hover:text-secondary hover:bg-background transition-colors focus:outline-none"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-surface border-b border-border shadow-level3" id="mobile-menu">
          <div className="space-y-1 px-2 pb-3 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`block rounded-md px-3 py-2 text-body-md font-semibold ${
                  isActive(link.href)
                    ? "bg-secondary/10 text-secondary"
                    : "text-primary hover:bg-background hover:text-secondary"
                }`}
              >
                {link.name}
              </Link>
            ))}
            <Link
              href="/tracking"
              onClick={() => setIsOpen(false)}
              className="block rounded-md px-3 py-2 text-body-md font-semibold text-primary hover:bg-background hover:text-secondary"
            >
              Track Shipment
            </Link>
            <div className="mt-4 px-3">
              <Link
                href="/contact?quote=true"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center justify-center gap-1.5 h-12 rounded-button bg-secondary text-white font-semibold text-body-md hover:bg-secondary/90 transition-colors"
              >
                Get a Quote
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
