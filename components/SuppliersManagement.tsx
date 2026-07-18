import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserCheck, Search, Filter, ChevronDown, ChevronUp, 
  Check, X, MessageSquare, ExternalLink, Package,
  MapPin, Calendar, Info, Loader2, AlertCircle,
  ClipboardList, Clock, DollarSign, User, Mail,
  FileText, Save, RefreshCw
} from 'lucide-react';
// Local Language alias — see SupplierPortal.tsx for rationale
type Language = 'EN' | 'ES' | 'PT';

interface Supplier {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  whatsapp: string;
  location: string;
  asset_type: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  google_calendar_id?: string;
  created_at: string;
}

interface Booking {
  id: string;
  asset_id: string;
  asset_name: string;
  asset_type: string;
  guest_name: string;
  guest_email: string;
  start_date: string;
  end_date: string;
  total_price: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  notes: string;
  created_at: string;
}

interface SuppliersManagementProps {
  lang: Language;
  onViewAssets: (supplierId: string) => void;
}

export const SuppliersManagement: React.FC<SuppliersManagementProps> = ({ lang, onViewAssets }) => {
  const [activeView, setActiveView] = useState<'SUPPLIERS' | 'BOOKINGS'>('SUPPLIERS');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONFIRMED' | 'CANCELLED'>('ALL');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setFilter('ALL');
    setSearch('');
    if (activeView === 'SUPPLIERS') {
      fetchSuppliers();
    } else {
      fetchBookings();
    }
  }, [activeView]);

  const fetchSuppliers = async () => {
    setSuppliersLoading(true);
    try {
      const res = await fetch('/api/suppliers');
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch suppliers', error);
      setSuppliers([]);
    } finally {
      setSuppliersLoading(false);
    }
  };

  const fetchBookings = async () => {
    setBookingsLoading(true);
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch bookings', error);
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/calendar/sync-all', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
      }
    } catch (error) {
      console.error('Failed to sync all calendars', error);
      alert('Failed to sync calendars');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/suppliers/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        setSuppliers(prev => prev.map(s => s.id === id ? { ...s, status } : s));
      }
    } catch (error) {
      console.error('Failed to update status', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBookingStatusUpdate = async (id: string, status: 'PENDING' | 'CONFIRMED' | 'CANCELLED') => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
        if (selectedBooking?.id === id) {
          setSelectedBooking(prev => prev ? { ...prev, status } : null);
        }
      }
    } catch (error) {
      console.error('Failed to update booking status', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedBooking) return;
    setIsSavingNotes(true);
    try {
      const res = await fetch(`/api/bookings/${selectedBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: bookingNotes })
      });
      const data = await res.json();
      if (data.success) {
        setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, notes: bookingNotes } : b));
        setSelectedBooking(prev => prev ? { ...prev, notes: bookingNotes } : null);
      }
    } catch (error) {
      console.error('Failed to save notes', error);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => {
    const matchesFilter = filter === 'ALL' || s.status === filter;
    const matchesSearch = s.business_name.toLowerCase().includes(search.toLowerCase()) || 
                         s.contact_name.toLowerCase().includes(search.toLowerCase()) ||
                         s.location.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredBookings = bookings.filter(b => {
    const matchesFilter = filter === 'ALL' || b.status === filter;
    const matchesSearch = b.guest_name.toLowerCase().includes(search.toLowerCase()) || 
                         b.asset_name.toLowerCase().includes(search.toLowerCase()) ||
                         b.guest_email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'CONFIRMED': return 'bg-gold/10 text-gold border-gold/20';
      case 'PENDING': return 'bg-white/10 text-white border-white/20';
      case 'REJECTED':
      case 'CANCELLED': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-white/5 text-white/40 border-white/10';
    }
  };

  const renderBookingModal = () => {
    if (!selectedBooking) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedBooking(null)}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl bg-luxury-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="p-8 border-b border-white/5 bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gold/10 text-gold rounded-xl flex items-center justify-center">
                <ClipboardList size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-serif text-white uppercase tracking-widest">Booking Details</h3>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">ID: {selectedBooking.id}</p>
              </div>
            </div>
            <button onClick={() => setSelectedBooking(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <X size={24} className="text-white/40" />
            </button>
          </div>

          <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase tracking-widest text-gold font-bold">Asset Information</h4>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                    <div className="flex items-center gap-3">
                      <Package size={16} className="text-white/40" />
                      <span className="text-sm text-white">{selectedBooking.asset_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="px-2 py-0.5 bg-white/10 rounded text-[8px] text-white/60 uppercase font-bold tracking-widest">
                        {selectedBooking.asset_type}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase tracking-widest text-gold font-bold">Guest Details</h4>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                    <div className="flex items-center gap-3">
                      <User size={16} className="text-white/40" />
                      <span className="text-sm text-white">{selectedBooking.guest_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail size={16} className="text-white/40" />
                      <span className="text-sm text-white/60">{selectedBooking.guest_email}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase tracking-widest text-gold font-bold">Journey Dates</h4>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar size={16} className="text-white/40" />
                      <div className="text-sm text-white">
                        {new Date(selectedBooking.start_date).toLocaleDateString()} - {new Date(selectedBooking.end_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock size={16} className="text-white/40" />
                      <span className="text-xs text-white/60">Duration: {Math.ceil((new Date(selectedBooking.end_date).getTime() - new Date(selectedBooking.start_date).getTime()) / (1000 * 60 * 60 * 24))} days</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase tracking-widest text-gold font-bold">Financials</h4>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/40 uppercase tracking-widest">Total Price</span>
                      <span className="text-xl text-gold font-light">{selectedBooking.total_price}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] uppercase tracking-widest text-gold font-bold">Management Notes</h4>
              <div className="relative">
                <textarea 
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-6 text-sm text-white font-light h-32 resize-none focus:outline-none focus:border-gold/50 transition-all"
                  placeholder="Add internal notes about this booking..."
                />
                <button 
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="absolute bottom-4 right-4 p-3 bg-gold text-luxury-black rounded-xl hover:bg-white transition-all disabled:opacity-50"
                >
                  {isSavingNotes ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap gap-4">
              <button 
                onClick={() => handleBookingStatusUpdate(selectedBooking.id, 'CONFIRMED')}
                disabled={actionLoading === selectedBooking.id || selectedBooking.status === 'CONFIRMED'}
                className={`flex-1 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all ${
                  selectedBooking.status === 'CONFIRMED' ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
                }`}
              >
                {actionLoading === selectedBooking.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Confirm Booking
              </button>
              <button 
                onClick={() => handleBookingStatusUpdate(selectedBooking.id, 'CANCELLED')}
                disabled={actionLoading === selectedBooking.id || selectedBooking.status === 'CANCELLED'}
                className={`flex-1 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all ${
                  selectedBooking.status === 'CANCELLED' ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white'
                }`}
              >
                {actionLoading === selectedBooking.id ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                Cancel Booking
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const isLoading = activeView === 'SUPPLIERS' ? suppliersLoading : bookingsLoading;

  if (isLoading && (activeView === 'SUPPLIERS' ? suppliers.length === 0 : bookings.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gold" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveView('SUPPLIERS')}
            className={`text-left transition-all ${activeView === 'SUPPLIERS' ? 'opacity-100' : 'opacity-30 hover:opacity-50'}`}
          >
            <h2 className="text-4xl font-serif text-white uppercase tracking-widest mb-2">Suppliers</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Network Management</p>
          </button>
          <div className="w-[1px] h-12 bg-white/10" />
          <button 
            onClick={() => setActiveView('BOOKINGS')}
            className={`text-left transition-all ${activeView === 'BOOKINGS' ? 'opacity-100' : 'opacity-30 hover:opacity-50'}`}
          >
            <h2 className="text-4xl font-serif text-white uppercase tracking-widest mb-2">Bookings</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Journey Orchestration</p>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input 
              type="text" 
              placeholder={activeView === 'SUPPLIERS' ? "Search partners..." : "Search bookings..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-6 focus:outline-none focus:border-gold/50 transition-all w-full lg:w-64 text-sm text-white"
            />
          </div>
          <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
            {(activeView === 'SUPPLIERS' ? ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] : ['ALL', 'PENDING', 'CONFIRMED', 'CANCELLED']).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                  filter === f ? 'bg-gold text-luxury-black' : 'text-white/40 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button 
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all disabled:opacity-50"
          >
            {isSyncing ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
            Sync All
          </button>
        </div>
      </div>

      {activeView === 'SUPPLIERS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-gold" size={48} />
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Fetching Partners...</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center gap-6">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/20">
                <AlertCircle size={40} />
              </div>
              <p className="text-sm uppercase tracking-widest text-white/40">
                {suppliers.length === 0 ? 'No suppliers yet' : 'No suppliers found matching your criteria'}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredSuppliers.map((supplier) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={supplier.id}
                  className="admin-card rounded-2xl overflow-hidden group border-white/5 hover:border-gold/30 transition-all flex flex-col"
                >
                  <div className="p-8 space-y-6 flex-1">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gold/10 rounded-xl flex items-center justify-center text-gold font-serif text-2xl">
                          {supplier.business_name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-xl font-serif text-white flex items-center gap-2">
                            {supplier.business_name}
                            {supplier.google_calendar_id && (
                              <div title="Google Calendar Connected">
                                <Calendar size={14} className="text-blue-400" />
                              </div>
                            )}
                          </h3>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{supplier.contact_name}</p>
                        </div>
                      </div>
                      <span className={`text-[8px] px-3 py-1 rounded-full border uppercase tracking-widest font-bold ${getStatusColor(supplier.status)}`}>
                        {supplier.status}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Package size={16} className="text-gold" />
                        <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{supplier.asset_type}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin size={16} className="text-gold" />
                        <span className="text-xs text-white/60">{supplier.location}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <MessageSquare size={16} className="text-emerald-400" />
                        <a 
                          href={`https://wa.me/${supplier.whatsapp.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-4"
                        >
                          {supplier.whatsapp}
                        </a>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock size={16} className="text-white/20" />
                        <span className="text-[10px] text-white/40 uppercase tracking-widest">
                          Submitted: {new Date(supplier.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4">
                      <p className="text-xs text-white/50 font-light leading-relaxed line-clamp-3 italic">
                        "{supplier.description}"
                      </p>
                    </div>
                  </div>

                  <div className="p-8 pt-0 flex gap-3">
                    {supplier.status === 'PENDING' ? (
                      <>
                        <button 
                          onClick={() => handleStatusUpdate(supplier.id, 'APPROVED')}
                          disabled={actionLoading === supplier.id}
                          className="flex-1 py-4 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                        >
                          {actionLoading === supplier.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          Approve
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(supplier.id, 'REJECTED')}
                          disabled={actionLoading === supplier.id}
                          className="flex-1 py-4 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                        >
                          {actionLoading === supplier.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                          Reject
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => onViewAssets(supplier.id)}
                        className="w-full py-4 bg-white/5 text-white/60 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-white/10 transition-all border border-white/10"
                      >
                        <Package size={16} /> View Inventory
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      ) : (
        <div className="admin-card rounded-2xl overflow-hidden border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-white/40 font-bold">Guest</th>
                  <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-white/40 font-bold">Asset</th>
                  <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-white/40 font-bold">Dates</th>
                  <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-white/40 font-bold">Total</th>
                  <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-white/40 font-bold">Status</th>
                  <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-white/40 font-bold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => {
                    setSelectedBooking(booking);
                    setBookingNotes(booking.notes || '');
                  }}>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40 font-bold">
                          <User size={20} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{booking.guest_name}</div>
                          <div className="text-[10px] text-white/40">{booking.guest_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div>
                        <div className="text-sm text-white">{booking.asset_name}</div>
                        <div className="text-[8px] text-white/40 uppercase tracking-widest">{booking.asset_type}</div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-xs text-white/60">
                        <Calendar size={12} className="text-gold" />
                        {new Date(booking.start_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-gold">{booking.total_price}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`text-[8px] px-2 py-1 rounded-full border uppercase tracking-widest font-bold ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-2 text-white/20 hover:text-white transition-colors">
                        <FileText size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4 text-white/20">
                        <AlertCircle size={48} />
                        <p className="text-sm uppercase tracking-widest">
                          {bookings.length === 0 ? 'No bookings yet' : 'No bookings found matching your criteria'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <AnimatePresence>
        {selectedBooking && renderBookingModal()}
      </AnimatePresence>
    </div>
  );
};
