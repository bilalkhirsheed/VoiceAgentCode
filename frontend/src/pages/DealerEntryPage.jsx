import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function DealerEntryPage() {
  const [dealerPhone, setDealerPhone] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    if (!dealerPhone.trim()) {
      setError('Please enter a dealer DID (primary phone).');
      return;
    }
    setError('');
    const phone = dealerPhone.trim();
    // Redirect into CRM, passing DID as query param
    navigate(`/crm?dealer_phone=${encodeURIComponent(phone)}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6]">
      <div className="w-full max-w-md rounded-[8px] bg-white shadow-sm border border-crm-border p-6">
        <div className="text-[18px] font-semibold text-crm-text text-center">Dealership CRM</div>
        <div className="mt-1 text-[13px] text-crm-text2 text-center">
          Enter the dealer DID (primary phone) to open the CRM.
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <div className="flex flex-col">
            <label className="text-xs font-medium text-crm-text2 mb-1">Dealer DID (primary phone)</label>
            <input
              type="text"
              value={dealerPhone}
              onChange={(e) => setDealerPhone(e.target.value)}
              placeholder="+923137633702"
              className="border border-crm-border rounded-[6px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-[6px] px-3 py-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-[6px] shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Open CRM
          </button>
        </form>
      </div>
    </div>
  );
}

