import React, { useState } from 'react';
import {
  Boxes,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Tag,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import { CatalogItem } from '../types';

interface ItemCatalogViewProps {
  items: CatalogItem[];
  onAddNewItem: (item: CatalogItem) => void;
}

export const ItemCatalogView: React.FC<ItemCatalogViewProps> = ({ items, onAddNewItem }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Item State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [englishName, setEnglishName] = useState('');
  const [category, setCategory] = useState('قطع غيار وصيانة معدات');
  const [standardSpecs, setStandardSpecs] = useState('');
  const [standardUnit, setStandardUnit] = useState('قطعة');
  const [estimatedUnitPrice, setEstimatedUnitPrice] = useState<number>(100);
  const [stockAvailable, setStockAvailable] = useState<number>(20);
  const [minStockLevel, setMinStockLevel] = useState<number>(10);

  const categories = Array.from(new Set(items.map((i) => i.category)));

  const filteredItems = items.filter((item) => {
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.standardSpecs.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !standardSpecs.trim()) {
      alert('يرجى كتابة اسم الصنف ومواصفاته الفنية القياسية.');
      return;
    }

    const newItem: CatalogItem = {
      id: `CAT-${String(items.length + 1).padStart(3, '0')}`,
      code: code || `PRT-${Math.floor(100 + Math.random() * 900)}`,
      name,
      englishName,
      category,
      standardSpecs,
      standardUnit,
      estimatedUnitPrice,
      stockAvailable,
      minStockLevel,
    };

    onAddNewItem(newItem);
    setShowAddModal(false);
    // Reset
    setName('');
    setEnglishName('');
    setStandardSpecs('');
    setCode('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6" id="catalog-view">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-md border border-amber-200">
              دليل الأصناف القياسي
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              توحيد المسميات والمواصفات للقضاء على الأخطاء اليدوية
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-amber-600" />
            <span>كتالوج الأصناف الموحد (Item Master Catalog)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            قاعدة بيانات مركزية للأصناف وقطع الغيار المعتمدة لعمليات المنجم والكسارات والمعدات
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة صنف قياسي جديد للكتالوج</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم، كود الصنف (مثال: PRT-DRL-115) أو المواصفة الفنية..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            جميع الفئات ({items.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const isLowStock = item.stockAvailable <= item.minStockLevel;

          return (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {item.code}
                  </span>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {item.category}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 leading-snug">{item.name}</h3>
                {item.englishName && (
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{item.englishName}</p>
                )}

                <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-500 block mb-0.5">
                    المواصفات الفنية المعتمدة:
                  </span>
                  <p className="text-xs text-slate-700 font-mono leading-relaxed">
                    {item.standardSpecs}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">الوحدة / السعر التقديري:</span>
                  <span className="font-bold text-slate-800">
                    {item.standardUnit} •{' '}
                    <span className="font-mono text-emerald-700 font-bold">
                      ${item.estimatedUnitPrice}
                    </span>
                  </span>
                </div>

                <div className="text-left">
                  <span className="text-slate-400 block text-[10px]">المخزون الميداني:</span>
                  <span
                    className={`font-bold font-mono inline-flex items-center gap-1 ${
                      isLowStock ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {isLowStock && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                    {item.stockAvailable} {item.standardUnit}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 pb-3 mb-4 border-b border-slate-100 flex items-center justify-between">
              <span>إضافة صنف جديد لدليل الأصناف القياسي</span>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </h3>

            <form onSubmit={handleCreateItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">كود الصنف (Item Code)</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="PRT-FLT-099"
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الفئة / التصنيف</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border rounded-lg p-2 font-semibold"
                  >
                    <option value="قطع غيار وصيانة معدات">قطع غيار وصيانة معدات</option>
                    <option value="معدات ومستهلكات حفر">معدات ومستهلكات حفر</option>
                    <option value="زيوت ومحروقات">زيوت ومحروقات</option>
                    <option value="مهمات الوقاية والسلامة (PPE)">مهمات الوقاية والسلامة (PPE)</option>
                    <option value="مهمات كهربائية وطاقة">مهمات كهربائية وطاقة</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الصنف باللغة العربية *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: إطارات شاحنة نقل خام 40 طن مقاس 24.00R35"
                  className="w-full border rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الاسم بالإنجليزية</label>
                <input
                  type="text"
                  value={englishName}
                  onChange={(e) => setEnglishName(e.target.value)}
                  placeholder="Mining Dump Truck Radial Tires"
                  className="w-full border rounded-lg p-2 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  المواصفات الفنية القياسية التفصيلية *
                </label>
                <textarea
                  rows={3}
                  value={standardSpecs}
                  onChange={(e) => setStandardSpecs(e.target.value)}
                  placeholder="المقاس، نوع المواد، الضغط، الماركة المتوافقة، المعايير القياسية..."
                  className="w-full border rounded-lg p-2 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الوحدة القياسية</label>
                  <select
                    value={standardUnit}
                    onChange={(e) => setStandardUnit(e.target.value)}
                    className="w-full border rounded-lg p-2 font-semibold"
                  >
                    <option value="قطعة">قطعة</option>
                    <option value="صندوق">صندوق</option>
                    <option value="دستة">دستة</option>
                    <option value="برميل">برميل</option>
                    <option value="لتر">لتر</option>
                    <option value="طن">طن</option>
                    <option value="متر">متر</option>
                    <option value="طقم">طقم</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">السعر التقديري ($)</label>
                  <input
                    type="number"
                    value={estimatedUnitPrice}
                    onChange={(e) => setEstimatedUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full border rounded-lg p-2 font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الرصيد الابتدائي</label>
                  <input
                    type="number"
                    value={stockAvailable}
                    onChange={(e) => setStockAvailable(parseInt(e.target.value, 10) || 0)}
                    className="w-full border rounded-lg p-2 font-mono text-center"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs"
                >
                  حفظ الصنف بالدليل القياسي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
