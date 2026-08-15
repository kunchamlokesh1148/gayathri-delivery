import { useState } from 'react';
import { X, Phone, Mail, HelpCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createSupportIssue } from '../services/db';

export default function HelpModal({ isOpen, onClose }) {
  const { user } = useAuth();
  
  // Form states
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to raise an issue.');
      return;
    }
    if (!issueType) {
      setError('Please select an issue type.');
      return;
    }
    if (issueType === 'Other' && !description.trim()) {
      setError('Please enter a description for your issue.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const issueData = {
        customerId: user.uid || '',
        customerName: user.ownerName || '',
        shopName: user.shopName || '',
        mobile: user.mobile || '',
        email: user.email || '',
        address: user.address || '',
        issueType,
        description: issueType === 'Other' ? description.trim() : ''
      };

      await createSupportIssue(issueData);
      
      // Success state
      setSuccessMsg('Your issue has been submitted successfully. Our support team will contact you soon.');
      // Reset form
      setIssueType('');
      setDescription('');
    } catch (err) {
      setError(err.message || 'Failed to submit issue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-300">
      {/* Background Overlay */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white overflow-hidden flex flex-col max-h-[90vh] z-10 custom-modal animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-300 ease-out">
        
        {/* Header */}
        <div className="bg-brand p-6 text-white text-center relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full transition cursor-pointer border border-white/10 active-bounce"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="inline-flex p-2.5 bg-brand-dark rounded-full mb-2.5 shadow-inner">
            <HelpCircle className="h-7 w-7 text-yellow-400" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Get Help</h2>
          <p className="text-xs text-brand-light mt-0.5 font-medium">Need Help? Contact Our Support Team</p>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto no-scrollbar p-6 space-y-6">
          
          {/* Support Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-gray-50 p-4 rounded-[20px] border border-brand/15">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-xl bg-brand-light text-brand flex items-center justify-center flex-shrink-0">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400">Mobile Support</p>
                  <a href="tel:+919247221802" className="text-sm font-bold text-gray-800 hover:text-brand transition">
                    +91 9247221802
                  </a>
                </div>
              </div>

              <div className="flex items-center space-x-3 border-t sm:border-t-0 sm:border-l border-gray-200 pt-3 sm:pt-0 sm:pl-3.5">
                <div className="h-9 w-9 rounded-xl bg-accent-light text-accent flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400">Email Support</p>
                  <a href="mailto:gayatricutmit@gmail.com" className="text-sm font-bold text-gray-800 hover:text-accent transition break-all">
                    gayatricutmit@gmail.com
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-2">
              <a
                href="tel:+919247221802"
                className="flex items-center justify-center gap-1.5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-full text-[11px] font-black shadow-sm hover:shadow-md transition-all text-center cursor-pointer active-bounce"
              >
                <Phone className="h-3.5 w-3.5" />
                Call Now
              </a>
              <a
                href="mailto:gayatricutmit@gmail.com"
                className="flex items-center justify-center gap-1.5 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-full text-[11px] font-black shadow-sm hover:shadow-md transition-all text-center cursor-pointer active-bounce"
              >
                <Mail className="h-3.5 w-3.5" />
                Send Email
              </a>
              <a
                href="https://wa.me/919247221802"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full text-[11px] font-black shadow-sm hover:shadow-md transition-all text-center cursor-pointer active-bounce"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white">
                  <path d="M12.012 2c-5.506 0-9.988 4.482-9.988 9.988 0 1.76.458 3.473 1.328 4.98L2 22l5.187-1.36a9.923 9.923 0 0 0 4.825 1.248c5.506 0 9.988-4.482 9.988-9.988 0-2.66-1.036-5.16-2.92-7.043A9.917 9.917 0 0 0 12.012 2zm6.986 14.153c-.3.844-1.503 1.554-2.072 1.66-.496.094-1.144.17-3.328-.73-2.793-1.15-4.595-4-4.735-4.188-.14-.188-1.144-1.523-1.144-2.91 0-1.388.723-2.072 1.01-2.366.29-.294.63-.365.844-.365.213 0 .428 0 .614.009.2.008.468-.077.73.57.267.654.912 2.223.99 2.383.08.16.133.348.027.562-.107.214-.16.348-.32.535-.16.188-.337.42-.48.57-.16.166-.33.348-.142.67.187.32.833 1.363 1.785 2.21.18.16.356.294.57.383.214.09.428.062.59-.125.16-.188.694-.809.882-1.087.188-.277.376-.232.633-.134.258.098 1.637.772 1.918.913.282.14.468.21.534.32.067.112.067.65-.232 1.493z" />
                </svg>
                WhatsApp
              </a>
            </div>
          </div>

          <hr className="border-gray-150" />

          {/* Raise an Issue Section */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-800 tracking-tight">Raise an Issue</h3>

            {error && (
              <div className="p-3.5 bg-red-50 text-red-700 text-xs font-semibold rounded-2xl border border-red-100 flex items-center gap-2">
                <AlertCircle className="h-4.5 w-4.5 text-red-550 flex-shrink-0" />
                {error}
              </div>
            )}

            {successMsg && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-2xl border border-emerald-100 flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{successMsg}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMsg('');
                    setIssueType('');
                    setDescription('');
                    setError('');
                  }}
                  className="w-full py-2.5 bg-accent hover:bg-accent-dark text-white rounded-full text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer text-center active-bounce"
                >
                  Raise Another Issue
                </button>
              </div>
            )}

            {!successMsg && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Issue Type Select */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Issue Type *</label>
                  <select
                    value={issueType}
                    onChange={(e) => {
                      setIssueType(e.target.value);
                      setError('');
                    }}
                    className="w-full bg-gray-50 border border-brand/20 rounded-2xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition"
                    required
                  >
                    <option value="">-- Select Issue Type --</option>
                    <option value="Missing Item">Missing Item</option>
                    <option value="Item Expired">Item Expired</option>
                    <option value="Item Damaged">Item Damaged</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Conditional Textarea */}
                {issueType === 'Other' && (
                  <div className="animate-in slide-in-from-top-2 duration-150">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Describe the Problem *</label>
                    <textarea
                      rows="3"
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        setError('');
                      }}
                      placeholder="Please describe your issue in detail so we can help you..."
                      className="w-full bg-gray-50 border border-brand/20 rounded-2xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white resize-none transition"
                      required
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-accent hover:bg-accent-dark text-white rounded-full text-sm font-black shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 active-bounce"
                >
                  {loading ? 'Submitting issue...' : 'Raise Issue'}
                </button>
              </form>
            )}
          </div>

          {/* Close Dismiss Button */}
          <button
            onClick={() => {
              onClose();
              setSuccessMsg(''); // Clear success state for next open
              setIssueType('');
              setDescription('');
            }}
            className="w-full py-2.5 bg-gray-150 hover:bg-gray-200 text-gray-700 font-bold rounded-full text-xs flex items-center justify-center transition border border-gray-200 active-bounce"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
