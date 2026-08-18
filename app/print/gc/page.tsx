"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface GcItem {
  articlesCount: number;
  description: string;
  weight: number;
  value: number;
}

interface GcNote {
  id: string;
  date: string;
  from: string;
  to: string;
  truckNumber: string;
  consignor: string;
  consignee: string;
  consignorGst: string;
  consigneeGst: string;
  items: GcItem[];
  freight: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  lessAdvance: number;
  balance: number;
  payableAt: string;
  gstPayee: string;
  deliveryAt: string;
  pan: string;
  driverName: string;
  driverSignature: string;
  dlNumber: string;
  lorryOwner: string;
  bankDetails: string;
  terms: string;
}

function GcPrintContent() {
  const searchParams = useSearchParams();
  const gcId = searchParams.get('id');
  const [note, setNote] = useState<GcNote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gcId) return;

    const fetchGc = async () => {
      try {
        const res = await fetch(`/api/gc`);
        const data = await res.json();
        if (data.success) {
          const found = data.gcNotes.find((n: GcNote) => n.id === gcId);
          setNote(found || null);
        }
      } catch (e) {
        console.error('Error fetching GC for print:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchGc();
  }, [gcId]);

  useEffect(() => {
    if (note) {
      const timer = setTimeout(() => {
        window.print();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [note]);

  if (loading) {
    return <div className="p-8 text-center text-body-md">Loading print preview...</div>;
  }

  if (!note) {
    return <div className="p-8 text-center text-body-md text-error">Consignment Copy not found ({gcId})</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto bg-white text-black print:p-0 print:max-w-full font-serif leading-tight">
      {/* Outer border mimicking physical pad */}
      <div className="border-4 border-black p-3 md:p-6">
        
        {/* Top Header Grid */}
        <div className="grid grid-cols-3 gap-2 border-b-2 border-black pb-3 items-center">
          <div className="text-xs">
            <p className="font-bold">BRANCHES:</p>
            <p>Salem: 98427 12345</p>
            <p>Chennai: 98420 56789</p>
            <p>Coimbatore: 98430 11122</p>
          </div>
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-primary">NEW BALAJI TRANSPORTS</h1>
            <p className="text-xs font-bold uppercase tracking-wide">Lorry Booking Agency & Commission Agents</p>
            <p className="text-[10px]">H.O: 12, Lorry Stand Bypass Road, Salem - 636002</p>
            <p className="text-[10px]">Email: booking@newbalajitransport.com | Tel: 0427-2441234</p>
          </div>
          <div className="text-right text-xs">
            <div className="border border-black p-1 inline-block text-left bg-surface-container-high font-mono">
              <p><strong>GC NOTE NO:</strong> <span className="font-bold text-sm text-error">{note.id}</span></p>
              <p><strong>DATE:</strong> {note.date}</p>
            </div>
          </div>
        </div>

        {/* Truck & Route Info Row */}
        <div className="grid grid-cols-4 gap-2 border-b border-black py-2 text-xs">
          <div><strong>TRUCK NUMBER:</strong> <span className="font-mono uppercase font-bold">{note.truckNumber}</span></div>
          <div><strong>FROM:</strong> <span className="uppercase font-bold">{note.from}</span></div>
          <div><strong>TO:</strong> <span className="uppercase font-bold">{note.to}</span></div>
          <div><strong>DELIVERY AT:</strong> <span className="uppercase font-bold">{note.deliveryAt}</span></div>
        </div>

        {/* Consignor / Consignee details */}
        <div className="grid grid-cols-2 gap-0 border-b border-black text-xs">
          <div className="border-r border-black p-3 space-y-2">
            <h2 className="font-bold uppercase underline">CONSIGNOR (Shipper)</h2>
            <p className="font-bold text-sm">{note.consignor}</p>
            <p><strong>GSTIN:</strong> <span className="font-mono">{note.consignorGst || 'N/A'}</span></p>
          </div>
          <div className="p-3 space-y-2">
            <h2 className="font-bold uppercase underline">CONSIGNEE (Receiver)</h2>
            <p className="font-bold text-sm">{note.consignee}</p>
            <p><strong>GSTIN:</strong> <span className="font-mono">{note.consigneeGst || 'N/A'}</span></p>
          </div>
        </div>

        {/* Driver and Lorry Owner Info */}
        <div className="grid grid-cols-4 gap-2 border-b border-black py-2 text-[11px] bg-surface-container-low">
          <div><strong>DRIVER NAME:</strong> {note.driverName}</div>
          <div><strong>DL NUMBER:</strong> <span className="font-mono">{note.dlNumber}</span></div>
          <div><strong>LORRY OWNER:</strong> {note.lorryOwner}</div>
          <div><strong>PAN NO:</strong> <span className="font-mono">{note.pan || 'N/A'}</span></div>
        </div>

        {/* Cargo Items Table */}
        <div className="min-h-[220px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-black bg-surface-container font-bold text-center">
                <th className="p-2 border-r border-black w-24">No. of Articles</th>
                <th className="p-2 border-r border-black">Description of Goods (Said to Contain)</th>
                <th className="p-2 border-r border-black w-32">Weight (Tons/Kg)</th>
                <th className="p-2 border-r border-black w-32">Declared Value</th>
                <th className="p-2 w-32">Freight / Charges</th>
              </tr>
            </thead>
            <tbody>
              {note.items.map((item, idx) => (
                <tr key={idx} className="border-b border-black text-center h-16">
                  <td className="p-2 border-r border-black font-mono font-bold text-sm">{item.articlesCount}</td>
                  <td className="p-2 border-r border-black text-left font-bold">{item.description}</td>
                  <td className="p-2 border-r border-black font-mono">{item.weight} Tons</td>
                  <td className="p-2 border-r border-black font-mono">₹{item.value.toLocaleString()}</td>
                  <td className="p-2 font-mono text-right pr-4 font-bold">₹{note.freight.toLocaleString()}</td>
                </tr>
              ))}
              {/* Empty padding rows for look and feel of old invoice pads */}
              <tr className="border-b border-black text-center h-24">
                <td className="p-2 border-r border-black"></td>
                <td className="p-2 border-r border-black text-left text-outline italic text-[10px]">
                  ** Carriage Subject to Salem Jurisdiction. All goods covered under Insurance.
                </td>
                <td className="p-2 border-r border-black"></td>
                <td className="p-2 border-r border-black"></td>
                <td className="p-2"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* GST / Freight Calculations Grid */}
        <div className="grid grid-cols-12 gap-0 border-t border-black text-xs">
          
          {/* Terms & Bank Info Column */}
          <div className="col-span-8 border-r border-black p-3 flex flex-col justify-between">
            <div>
              <p className="font-bold underline mb-1 uppercase text-[10px]">Terms & Conditions:</p>
              <ol className="list-decimal pl-4 text-[9px] space-y-1 text-on-surface-variant">
                <li>Goods carried entirely at owner&apos;s risk. The transporter is not responsible for any leaks, damage, or fire.</li>
                <li>Demurrage/waiting charges apply at ₹2,500 per day if unloading is delayed beyond 24 hours of arrival.</li>
                <li>Disputes and legal settlements are subject strictly to Salem jurisdiction.</li>
                <li>GST payable as marked. Consignee copy must be produced to claim delivery.</li>
              </ol>
            </div>
            <div className="mt-4 border-t pt-2 text-[10px]">
              <p><strong>BANK DETAILS:</strong> {note.bankDetails || 'SBI Salem Branch, A/C: 30128374659, IFSC: SBIN0001012'}</p>
            </div>
          </div>

          {/* Pricing Stack Column */}
          <div className="col-span-4 font-mono text-xs">
            <div className="flex justify-between border-b border-black p-2">
              <span>Freight Charge:</span>
              <span className="font-bold">₹{note.freight.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b border-black p-2 text-[11px]">
              <span>CGST (2.5%):</span>
              <span>₹{note.cgst.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b border-black p-2 text-[11px]">
              <span>SGST (2.5%):</span>
              <span>₹{note.sgst.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b border-black p-2 text-[11px]">
              <span>IGST (5%):</span>
              <span>₹{note.igst.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b border-black p-2 bg-surface-container font-bold">
              <span>Grand Total:</span>
              <span>₹{note.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b border-black p-2 text-error font-semibold">
              <span>Less Advance Paid:</span>
              <span>- ₹{note.lessAdvance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between p-2 bg-primary text-on-primary font-black text-sm">
              <span>Balance Due:</span>
              <span>₹{note.balance.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* GST Payee and Payable Settlement Row */}
        <div className="grid grid-cols-3 gap-2 border-t border-black py-2 text-xs text-center bg-surface-container-low">
          <div><strong>GST TAX PAYABLE BY:</strong> <span className="font-bold uppercase underline">{note.gstPayee}</span></div>
          <div><strong>PAYABLE AT:</strong> <span className="font-bold uppercase underline">{note.payableAt || note.to}</span></div>
          <div><strong>GST STATUS:</strong> <span className="font-bold text-success uppercase">REVERSE CHARGE APPLICABLE</span></div>
        </div>

        {/* Signatures & Execution Bottom Row */}
        <div className="grid grid-cols-3 gap-4 mt-8 pt-4 text-xs text-center">
          <div>
            <div className="h-10 flex items-end justify-center">
              <span className="font-serif italic font-semibold">{note.driverSignature || 'Rajesh'}</span>
            </div>
            <p className="border-t border-black pt-1 font-bold">Driver Signature</p>
          </div>
          <div>
            <div className="h-10 flex items-end justify-center">
              <span className="text-outline border-b border-dashed w-28"></span>
            </div>
            <p className="border-t border-black pt-1 font-bold">Consignee Seal & Sign</p>
          </div>
          <div>
            <div className="h-10 flex items-end justify-center font-mono font-bold text-primary">
              For NEW BALAJI TRANSPORTS
            </div>
            <p className="border-t border-black pt-1 font-bold text-error">Booking Clerk / Manager</p>
          </div>
        </div>

      </div>

      {/* Print Help Banner */}
      <div className="mt-8 text-center text-[10px] text-outline border-t pt-4 print:hidden">
        Press <strong>Ctrl + P</strong> (Windows) or <strong>Cmd + P</strong> (Mac) if the print dialog did not open automatically.
      </div>
    </div>
  );
}

export default function GcPrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-body-md">Initializing Goods Consignment print view...</div>}>
      <GcPrintContent />
    </Suspense>
  );
}
