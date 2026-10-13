import React, { useMemo, useState } from 'react';
import { PurchaseInvoice, SalesInvoice, IndoorInvoice } from '../DiagnosticData';
import { MedicineIcon, BackIcon, MapPinIcon, PhoneIcon } from '../Icons';
import { normalizeDate } from '../../dbService';

interface MedicineAccountsPageProps {
  onBack: () => void;
  purchaseInvoices: PurchaseInvoice[];
  salesInvoices: SalesInvoice[];
  indoorInvoices: IndoorInvoice[];
}

const monthOptions = [
    { value: 0, name: 'January' }, { value: 1, name: 'February' }, { value: 2, name: 'March' },
    { value: 3, name: 'April' }, { value: 4, name: 'May' }, { value: 5, name: 'June' },
    { value: 6, name: 'July' }, { value: 7, name: 'August' }, { value: 8, name: 'September' },
    { value: 9, name: 'October' }, { value: 10, name: 'November' }, { value: 11, name: 'December' }
];

const MedicineAccountsPage: React.FC<MedicineAccountsPageProps> = ({ 
  onBack, purchaseInvoices = [], salesInvoices = [], indoorInvoices = [] 
}) => {
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [manualProfitDistAmount, setManualProfitDistAmount] = useState<number>(0); 

    const stats = useMemo(() => {
        const safePurchases = Array.isArray(purchaseInvoices) ? purchaseInvoices : [];
        const safeSales = Array.isArray(salesInvoices) ? salesInvoices : [];
        const safeIndoor = Array.isArray(indoorInvoices) ? indoorInvoices : [];

        const normalizeDateStr = (dateStr?: string | null): string => {
            return normalizeDate(dateStr);
        };

        const isSelectedMonth = (rawDate?: string | null) => {
            const dateStr = normalizeDateStr(rawDate);
            if (!dateStr) return false;
            const parts = dateStr.split('-');
            if (parts.length < 2) return false;
            const y = Number(parts[0]);
            const m = Number(parts[1]);
            return m - 1 === selectedMonth && y === selectedYear;
        };

        const isBeforeSelectedMonth = (rawDate?: string | null) => {
            const dateStr = normalizeDateStr(rawDate);
            if (!dateStr) return false;
            const parts = dateStr.split('-');
            if (parts.length < 2) return false;
            const y = Number(parts[0]);
            const m = Number(parts[1]);
            return y < selectedYear || (y === selectedYear && m - 1 < selectedMonth);
        };

        const getInvDate = (inv: any): string => {
            return inv?.invoiceDate || inv?.invoice_date || inv?.admission_date || inv?.date || inv?.createdDate || '';
        };

        const getSafeInvAmount = (inv: any) => {
            if (!inv) return 0;
            const net = Number(inv.netPayable ?? inv.net_payable);
            if (!isNaN(net) && net > 0) return net;
            const paid = Number(inv.paidAmount ?? inv.paid_amount);
            if (!isNaN(paid) && paid > 0) return paid;
            const tot = Number(inv.totalAmount ?? inv.total_amount ?? 0);
            const disc = Number(inv.discount ?? 0);
            if (tot > 0) return Math.max(0, tot - disc);
            if (Array.isArray(inv.items) && inv.items.length > 0) {
                const calculated = inv.items.reduce((sum: number, it: any) => {
                    const line = Number(it.lineTotalBuy ?? it.lineTotalSell ?? it.payable_amount ?? it.line_total);
                    if (!isNaN(line) && line > 0) return sum + line;
                    const price = Number(it.unitPriceBuy ?? it.unitPriceSell ?? it.price ?? 0);
                    const qty = Number(it.qtyBuying ?? it.qtySelling ?? it.quantity ?? 1);
                    return sum + (price * qty);
                }, 0);
                if (calculated > 0) return Math.max(0, calculated - disc);
            }
            return 0;
        };

        // Calculate Current Month Stats
        // Exclude 'Initial' status from current expenses (Opening stock fix)
        const currentInvoices = safePurchases.filter(inv => {
            if (!inv || inv.status === 'Initial' || inv.status === 'Cancelled' || inv.status === 'Deleted') return false;
            return isSelectedMonth(getInvDate(inv));
        });

        const currentOutdoorSales = safeSales.filter(inv => {
            if (!inv || (inv as any).status === 'Cancelled' || (inv as any).status === 'Returned' || (inv as any).status === 'Deleted') return false;
            return isSelectedMonth(getInvDate(inv));
        });

        const currentIndoorSales = safeIndoor.filter(inv => {
            if (!inv || inv.status === 'Cancelled' || inv.status === 'Returned' || inv.status === 'Deleted') return false;
            return isSelectedMonth(getInvDate(inv));
        });

        // Summing values
        const totalBuyCurrent = currentInvoices.reduce((sum, inv) => sum + getSafeInvAmount(inv), 0);
        const totalSellOutdoor = currentOutdoorSales.reduce((sum, inv) => sum + getSafeInvAmount(inv), 0);
        const totalSellIndoor = currentIndoorSales.reduce((sum, inv) => {
            const safeItems = Array.isArray(inv.items) ? inv.items : [];
            const medItemsTotal = safeItems
                .filter(it => it && (it.service_type === 'Medicine' || it.service_type === 'ঔষধ' || (it.service_type || '').toLowerCase().includes('med')))
                .reduce((s, it) => s + (Number(it.payable_amount) || Number(it.line_total) || 0), 0);
            return sum + medItemsTotal;
        }, 0);

        const totalSellCurrent = totalSellOutdoor + totalSellIndoor;

        // Cumulative Stats (Previous Months)
        const prevPurchaseTotal = safePurchases.filter(inv => {
            if (!inv || inv.status === 'Cancelled' || inv.status === 'Initial' || inv.status === 'Deleted') return false;
            return isBeforeSelectedMonth(getInvDate(inv));
        }).reduce((sum, inv) => sum + getSafeInvAmount(inv), 0);

        const prevOutdoorTotal = safeSales.filter(inv => {
            if (!inv || (inv as any).status === 'Cancelled' || (inv as any).status === 'Returned' || (inv as any).status === 'Deleted') return false;
            return isBeforeSelectedMonth(getInvDate(inv));
        }).reduce((sum, inv) => sum + getSafeInvAmount(inv), 0);

        const prevIndoorTotal = safeIndoor.filter(inv => {
            if (!inv || inv.status === 'Cancelled' || inv.status === 'Returned' || inv.status === 'Deleted') return false;
            return isBeforeSelectedMonth(getInvDate(inv));
        }).reduce((sum, inv) => {
             const medItemsTotal = (inv.items || [])
                .filter(it => it && (it.service_type === 'Medicine' || it.service_type === 'ঔষধ' || (it.service_type || '').toLowerCase().includes('med')))
                .reduce((s, it) => s + (Number(it.payable_amount) || Number(it.line_total) || 0), 0);
            return sum + medItemsTotal;
        }, 0);

        const totalSellPrev = prevOutdoorTotal + prevIndoorTotal;

        // Balance logic
        const cashDepositThisMonth = totalSellCurrent; 
        const prevAccumulation = totalSellPrev - prevPurchaseTotal;

        // Monthly List Generation for Chart
        const monthlyData: Record<string, { buy: number, sell: number }> = {};
        safePurchases.forEach(inv => {
            if (!inv || inv.status === 'Cancelled' || inv.status === 'Initial' || inv.status === 'Deleted') return;
            const norm = normalizeDateStr(getInvDate(inv));
            if (!norm) return;
            const [y, m] = norm.split('-').map(Number);
            if (y === selectedYear && m >= 1 && m <= 12) {
                const monthName = monthOptions[m - 1]?.name || `Month ${m}`;
                if (!monthlyData[monthName]) monthlyData[monthName] = { buy: 0, sell: 0 };
                monthlyData[monthName].buy += getSafeInvAmount(inv);
            }
        });
        safeSales.forEach(inv => {
            if (!inv || (inv as any).status === 'Cancelled' || (inv as any).status === 'Returned' || (inv as any).status === 'Deleted') return;
            const norm = normalizeDateStr(getInvDate(inv));
            if (!norm) return;
            const [y, m] = norm.split('-').map(Number);
            if (y === selectedYear && m >= 1 && m <= 12) {
                const monthName = monthOptions[m - 1]?.name || `Month ${m}`;
                if (!monthlyData[monthName]) monthlyData[monthName] = { buy: 0, sell: 0 };
                monthlyData[monthName].sell += getSafeInvAmount(inv);
            }
        });
        safeIndoor.forEach(inv => {
            if (!inv || inv.status === 'Cancelled' || inv.status === 'Returned' || inv.status === 'Deleted') return;
            const norm = normalizeDateStr(getInvDate(inv));
            if (!norm) return;
            const [y, m] = norm.split('-').map(Number);
            if (y === selectedYear && m >= 1 && m <= 12) {
                const monthName = monthOptions[m - 1]?.name || `Month ${m}`;
                if (!monthlyData[monthName]) monthlyData[monthName] = { buy: 0, sell: 0 };
                monthlyData[monthName].sell += (inv.items || []).filter(it => it && (it.service_type === 'Medicine' || it.service_type === 'ঔষধ' || (it.service_type || '').toLowerCase().includes('med'))).reduce((s, it) => s + (Number(it.payable_amount) || Number(it.line_total) || 0), 0);
            }
        });

        return {
            totalBuyCurrent,
            totalSellCurrent,
            totalBuyPrev: prevPurchaseTotal,
            totalSellPrev: totalSellPrev,
            prevAccumulation,
            cashDepositThisMonth,
            monthlyList: Object.entries(monthlyData).map(([name, data]) => ({ name, ...data }))
        };
    }, [purchaseInvoices, salesInvoices, indoorInvoices, selectedMonth, selectedYear]);

    const grandTotalSell = stats.totalSellCurrent + stats.totalSellPrev;
    const grandTotalBuy = stats.totalBuyCurrent + stats.totalBuyPrev;
    const currentBalance = grandTotalSell - grandTotalBuy;
    const profitDistValue = manualProfitDistAmount;
    const remainingBalance = currentBalance - profitDistValue;

    const handlePrint = () => { window.print(); };

    const headerCell = "p-3 border border-slate-600 bg-slate-700 text-slate-100 font-bold text-center font-bengali";
    const cell = "p-3 border border-slate-600 text-slate-300 font-bold text-center";
    const labelCell = "p-3 border border-slate-600 text-slate-200 font-bold bg-slate-800/50 font-bengali";

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
            <header className="bg-slate-800 shadow-xl border-b border-slate-700 z-20 sticky top-0 no-print">
                <div className="max-w-7xl mx-auto py-6 px-6">
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col items-start">
                            <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-100">
                                Niramoy Clinic & Diagnostic
                            </h1>
                            <span className="text-xs text-cyan-500 uppercase tracking-widest">Medicine Accounts Summary</span>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={onBack} className="flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-lg hover:bg-slate-600 transition-colors">
                                <BackIcon className="w-4 h-4" /> Back
                            </button>
                            <button onClick={handlePrint} className="bg-blue-600 px-6 py-2 rounded-lg font-bold hover:bg-blue-500 transition-shadow shadow-lg">
                                Print Sheet
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
                <div className="text-center mb-10 hidden print:block">
                    <h2 className="text-3xl font-bold font-bengali">নিরাময় ক্লিনিক এন্ড ডায়াগনস্টিক</h2>
                    <p className="text-lg font-bengali">এনায়েতপুর মন্ডলপাড়া, এনায়েতপুর সিরাজগঞ্জ।</p>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 no-print gap-4">
                    <h2 className="text-3xl font-extrabold font-bengali text-amber-400 border-b-2 border-amber-500/30 pb-2">মেডিসিন ক্রয়-বিক্রয় ব্যালেন্স</h2>
                    <div className="flex flex-wrap gap-4 items-center bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">লভ্যাংশ বণ্টন (টাকা)</label>
                            <input 
                                type="number" 
                                value={manualProfitDistAmount || ''} 
                                onChange={e => setManualProfitDistAmount(parseFloat(e.target.value) || 0)}
                                className="w-32 bg-slate-900 border border-slate-600 rounded-lg p-2 text-white font-black text-center focus:ring-2 focus:ring-amber-500 outline-none"
                                onFocus={e => e.target.select()}
                                placeholder="টাকা লিখুন"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Select Month</label>
                            <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="bg-slate-800 border border-slate-600 p-2 rounded-lg text-white font-bold outline-none focus:ring-2 focus:ring-blue-500">
                                {monthOptions.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Select Year</label>
                            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-slate-800 border border-slate-600 p-2 rounded-lg text-white font-bold outline-none focus:ring-2 focus:ring-blue-500">
                                {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800/30 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="p-3 border border-slate-600 w-1/4"></th>
                                <th className={headerCell}>মোট ঔষধ বিক্রয়</th>
                                <th className={headerCell}>মোট ঔষধ ক্রয়</th>
                                <th className={headerCell}>ব্যালেন্স</th>
                                <th className={headerCell}>লভ্যাংশ বণ্টন</th>
                                <th className={headerCell}>অবশিষ্ট</th>
                            </tr>
                        </thead>
                        <tbody className="text-lg">
                            <tr>
                                <td className={labelCell}>বর্তমান মাসের বিক্রয় =</td>
                                <td className={cell}>{stats.totalSellCurrent.toLocaleString()}</td>
                                <td className={cell}>{stats.totalBuyCurrent.toLocaleString()}</td>
                                <td className={`${cell} bg-slate-900/50`}></td>
                                <td className={`${cell} bg-slate-900/50`}></td>
                                <td className={`${cell} bg-slate-900/50`}></td>
                            </tr>
                            <tr>
                                <td className={labelCell}>পূর্বের মাস সমূহের জমা =</td>
                                <td className={cell}>{stats.totalSellPrev.toLocaleString()}</td>
                                <td className={cell}>{stats.totalBuyPrev.toLocaleString()}</td>
                                <td className={`${cell} bg-slate-900/50`}></td>
                                <td className={`${cell} bg-slate-900/50`}></td>
                                <td className={`${cell} bg-slate-900/50`}></td>
                            </tr>
                            <tr className="bg-blue-900/20">
                                <td className={`${labelCell} !bg-blue-900/30 text-2xl`}>মোট =</td>
                                <td className={`${cell} text-2xl text-emerald-400 font-black`}>{grandTotalSell.toLocaleString()}</td>
                                <td className={`${cell} text-2xl text-rose-400 font-black`}>{grandTotalBuy.toLocaleString()}</td>
                                <td className={`${cell} text-2xl text-blue-400 font-black bg-slate-900`}>{currentBalance.toLocaleString()}</td>
                                <td className={`${cell} text-2xl text-amber-400 font-black`}>{profitDistValue.toLocaleString()}</td>
                                <td className={`${cell} text-2xl text-white font-black bg-slate-800`}>{remainingBalance.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-16">
                    <div className="space-y-4">
                        <h4 className="text-2xl font-bold font-bengali text-cyan-400 mb-4 underline decoration-cyan-500/30">বর্তমান হিসাব:</h4>
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden max-w-sm">
                            <table className="w-full">
                                <tbody>
                                    <tr className="border-b border-slate-700">
                                        <td className="p-4 font-bengali font-bold text-slate-300">পূর্বের মাস সমূহের জমা =</td>
                                        <td className="p-4 text-right font-black text-white text-xl border-l border-slate-700">{stats.prevAccumulation.toLocaleString()}</td>
                                    </tr>
                                    <tr className="border-b border-slate-700">
                                        <td className="p-4 font-bengali font-bold text-slate-300">এই মাসের ক্যাশ জমা =</td>
                                        <td className="p-4 text-right font-black text-white text-xl border-l border-slate-700">{stats.cashDepositThisMonth.toLocaleString()}</td>
                                    </tr>
                                    <tr className="bg-emerald-900/20">
                                        <td className="p-4 font-bengali font-bold text-emerald-400">মোট জমা =</td>
                                        <td className="p-4 text-right font-black text-emerald-400 text-2xl border-l border-slate-700">{(stats.prevAccumulation + stats.cashDepositThisMonth).toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 shadow-inner">
                        <h4 className="text-xl font-bold text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                             <MedicineIcon className="w-5 h-5 text-rose-400" />
                             Annual Performance Chart
                        </h4>
                        <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                            {stats.monthlyList.length > 0 ? stats.monthlyList.map((m, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-blue-500/50 transition-colors">
                                    <span className="font-bold text-slate-200">{m.name}/{String(selectedYear).slice(-2)}</span>
                                    <div className="flex gap-6">
                                        <div className="text-right">
                                            <span className="text-[10px] text-slate-500 uppercase block">Sell</span>
                                            <span className="font-bold text-emerald-400">৳{m.sell.toLocaleString()}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] text-slate-500 uppercase block">Buy</span>
                                            <span className="font-bold text-rose-400">৳{m.buy.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 text-slate-600 italic">No historical data found for {selectedYear}.</div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mt-20 text-center text-slate-500 text-sm italic border-t border-slate-800 pt-6">
                    &copy; 2024 Niramoy Clinic Accounts Management System. All financial data calculated based on system invoices.
                </div>
            </main>
        </div>
    );
};

class MedicineAccountsErrorBoundary extends React.Component<{ onBack?: () => void; children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("MedicineAccountsPage Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-lg shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto text-3xl font-bold">
              ⚠️
            </div>
            <h2 className="text-2xl font-bold text-white">মেডিসিন হিসাব রেন্ডারিং সমস্যা</h2>
            <p className="text-slate-300 text-sm">
              সাময়িক একটি ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন অথবা মূল অ্যাকাউন্টিং পেজে ফিরে যান।
            </p>
            {this.state.error && (
              <div className="p-3 bg-slate-950 rounded-xl text-left text-xs font-mono text-rose-300 overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}
            <div className="flex justify-center gap-4 pt-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg transition-all"
              >
                আবার চেষ্টা করুন
              </button>
              {this.props.onBack && (
                <button
                  onClick={this.props.onBack}
                  className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm transition-all"
                >
                  ফিরে যান
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const MedicineAccountsPageWrapped: React.FC<MedicineAccountsPageProps> = (props) => {
  return (
    <MedicineAccountsErrorBoundary onBack={props.onBack}>
      <MedicineAccountsPage {...props} />
    </MedicineAccountsErrorBoundary>
  );
};

export default MedicineAccountsPageWrapped;
export { MedicineAccountsPage };