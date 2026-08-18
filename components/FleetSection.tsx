'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Truck, Container, Zap, X, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface FleetCard {
  id: number;
  vehicle: string;
  type: string;
  units: number;
  image: string;
  images?: string[];
  icon: React.ReactNode;
}

const fleetCards: FleetCard[] = [
  {
    id: 1,
    vehicle: '12-Wheeler Open Body Truck',
    type: 'Open Body',
    units: 4,
    image: '/images/truck-12-wheeler-new-1.png',
    images: ['/images/truck-12-wheeler-new-1.png', '/images/truck-12-wheeler-new-2.png'],
    icon: <Truck className="w-6 h-6" />,
  },
  {
    id: 2,
    vehicle: '14-Wheeler Open Body Truck',
    type: 'Open Body',
    units: 2,
    image: '/images/truck-12-wheeler-new-2.png',
    icon: <Truck className="w-6 h-6" />,
  },
  {
    id: 3,
    vehicle: '16-Wheeler Open Body Truck',
    type: 'Open Body',
    units: 3,
    image: '/images/truck-16-wheeler.jpeg',
    icon: <Truck className="w-6 h-6" />,
  },
  {
    id: 4,
    vehicle: '10-Wheeler 32 FT Container Truck',
    type: '32 FT Container',
    units: 2,
    image: '/images/truck-container-10-wheeler.jpeg',
    icon: <Container className="w-6 h-6" />,
  },
];

export default function FleetSection() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [selectedFleet, setSelectedFleet] = useState<FleetCard | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-white to-slate-100 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-teal-100 border border-blue-200">
              <Zap className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-700">Our Premium Fleet</span>
            </div>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Our Fleet
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Reliable fleet of open-body trucks and container vehicles for safe, efficient, and timely transportation across India.
          </p>
        </div>

        {/* Fleet Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-6">
          {fleetCards.map((card) => (
            <div
              key={card.id}
              className="group relative h-full"
              onMouseEnter={() => setHoveredCard(card.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Premium Card Container */}
              <div className="relative h-full bg-white rounded-2xl overflow-hidden border border-slate-200/80 backdrop-blur-xl transition-all duration-300 hover:border-blue-400/60 shadow-lg hover:shadow-2xl hover:-translate-y-2">
                
                {/* Image Container with Gradient Overlay */}
                <div className="relative h-48 overflow-hidden bg-slate-100">
                  <Image
                    src={card.image}
                    alt={card.vehicle}
                    fill
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/30 group-hover:to-slate-900/40 transition-all duration-300"></div>

                  {/* Available Badge */}
                  <div className="absolute top-4 right-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 text-white text-xs font-bold shadow-lg backdrop-blur-sm">
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                      Available
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 flex flex-col justify-between h-[calc(100%-12rem)]">
                  {/* Vehicle Info */}
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 text-blue-600">
                        {card.icon}
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight">
                      {card.vehicle}
                    </h3>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Type:</span>
                        <span className="text-sm font-semibold text-slate-800">{card.type}</span>
                      </div>
                      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                        <span className="text-sm text-slate-600">Available Units:</span>
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 text-white font-bold text-sm">
                          {card.units}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95">
                      Request Quote
                    </button>
                    <button 
                      onClick={() => setSelectedFleet(card)}
                      className="w-full px-4 py-2.5 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg transition-all duration-300 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
                    >
                      View Details
                    </button>
                  </div>
                </div>

                {/* Hover Glow Effect */}
                {hoveredCard === card.id && (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-teal-400/10 pointer-events-none rounded-2xl"></div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA Section */}
        <div className="mt-16 text-center">
          <p className="text-slate-600 mb-6">
            Need a specific configuration? Contact our fleet management team for custom solutions.
          </p>
          <button className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-semibold rounded-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95">
            Contact Our Fleet Team
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Detail View Modal */}
      {selectedFleet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => {
                setSelectedFleet(null);
                setCurrentImageIndex(0);
              }}
              className="absolute top-6 right-6 z-10 p-2 bg-slate-100 hover:bg-red-100 rounded-full transition-all duration-300 hover:scale-110 shadow-md"
            >
              <X className="w-6 h-6 text-slate-700" />
            </button>

            {/* Detail Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full">
              {/* Left: Image Carousel Section */}
              <div className="flex flex-col justify-center items-center bg-gradient-to-br from-slate-50 to-slate-100 p-8 lg:p-12 rounded-t-3xl lg:rounded-l-3xl lg:rounded-tr-none min-h-96 lg:min-h-screen">
                <div className="relative w-full h-80 lg:h-96 bg-white rounded-2xl overflow-hidden group shadow-lg border border-slate-200">
                  <Image
                    src={selectedFleet.images?.[currentImageIndex] || selectedFleet.image}
                    alt={`${selectedFleet.vehicle} - View ${currentImageIndex + 1}`}
                    fill
                    className="w-full h-full object-contain transition-transform duration-500 p-4"
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  {/* Image Navigation - Show only if multiple images */}
                  {selectedFleet.images && selectedFleet.images.length > 1 && (
                    <>
                      {/* Previous Button */}
                      <button
                        onClick={() =>
                          setCurrentImageIndex(
                            currentImageIndex === 0
                              ? selectedFleet.images!.length - 1
                              : currentImageIndex - 1
                          )
                        }
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/95 hover:bg-white rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110 shadow-lg"
                      >
                        <ChevronLeft className="w-6 h-6 text-slate-900" />
                      </button>

                      {/* Next Button */}
                      <button
                        onClick={() =>
                          setCurrentImageIndex(
                            currentImageIndex === selectedFleet.images!.length - 1
                              ? 0
                              : currentImageIndex + 1
                          )
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/95 hover:bg-white rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110 shadow-lg"
                      >
                        <ChevronRight className="w-6 h-6 text-slate-900" />
                      </button>

                      {/* Image Counter */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900/80 text-white rounded-full text-sm font-semibold backdrop-blur-sm">
                        {currentImageIndex + 1} / {selectedFleet.images.length}
                      </div>

                      {/* Thumbnail Navigation Dots */}
                      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-3">
                        {selectedFleet.images.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`transition-all duration-300 rounded-full ${
                              idx === currentImageIndex
                                ? 'bg-blue-600 w-3 h-3'
                                : 'bg-slate-300 hover:bg-slate-400 w-2.5 h-2.5'
                            }`}
                            aria-label={`View image ${idx + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right: Vehicle Details Section */}
              <div className="flex flex-col justify-between p-8 lg:p-12 bg-white rounded-b-3xl lg:rounded-r-3xl lg:rounded-bl-none">
                {/* Header Section */}
                <div className="space-y-4 pb-6">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-blue-100 w-fit">
                    <div className="text-blue-600">{selectedFleet.icon}</div>
                    <span className="text-sm font-semibold text-blue-700">{selectedFleet.type}</span>
                  </div>

                  {/* Title */}
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 leading-tight">
                      {selectedFleet.vehicle}
                    </h1>
                    <p className="text-base text-slate-500 mt-2">Premium heavy-duty transport solution</p>
                  </div>
                </div>

                {/* Specifications Grid */}
                <div className="space-y-4 py-6 border-y border-slate-200">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Vehicle Type */}
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Vehicle Type</p>
                      <p className="text-lg font-bold text-slate-900">{selectedFleet.type}</p>
                    </div>

                    {/* Available Units */}
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Available Units</p>
                      <p className="text-lg font-bold text-blue-600">{selectedFleet.units} Units</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="bg-emerald-50 rounded-xl p-4 flex items-center justify-between">
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Status</p>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                      <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></div>
                      Available
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-3 py-6">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">About This Vehicle</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    {selectedFleet.id === 1 && "Our 12-wheeler open body trucks are perfect for transporting construction materials, agricultural produce, and industrial goods across India. Equipped with modern safety features and GPS tracking."}
                    {selectedFleet.id === 2 && "The 14-wheeler open body truck offers superior load capacity and stability for long-haul transportation. Ideal for heavy industrial cargo and bulk material movement with enhanced suspension systems."}
                    {selectedFleet.id === 3 && "Our 16-wheeler open body trucks are designed for heavy-duty infrastructure hauling and oversized machinery transport. Maximum payload capacity with advanced braking and safety systems."}
                    {selectedFleet.id === 4 && "The 10-wheeler 32 FT container truck is purpose-built for container logistics and FMCG distribution. Secure containerized transport with real-time tracking and climate control options."}
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-3 py-6 border-t border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Key Features</h3>
                  <ul className="grid grid-cols-2 gap-3">
                    <li className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></span>
                      <span className="text-sm text-slate-700">GPS Tracking</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></span>
                      <span className="text-sm text-slate-700">Expert Drivers</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></span>
                      <span className="text-sm text-slate-700">Regular Maintenance</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></span>
                      <span className="text-sm text-slate-700">Insurance Coverage</span>
                    </li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6">
                  <button className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
                    Request Quote
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedFleet(null);
                      setCurrentImageIndex(0);
                    }}
                    className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-all duration-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
