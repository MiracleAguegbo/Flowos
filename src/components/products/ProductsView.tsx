import React, { useState } from 'react';
import { Product } from '../../types';
import {
  Search,
  Plus,
  Package,
  Copy,
  Check,
  Tag,
  Share2,
  Trash2,
  Edit2,
  ExternalLink,
} from 'lucide-react';
import { Modal } from '../common/Modal';

interface ProductsViewProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id' | 'businessId'>) => void;
  onDeleteProduct: (id: string) => void;
  onOpenChatWithDraft?: (draftMessage: string) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  onAddProduct,
  onDeleteProduct,
  onOpenChatWithDraft,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    category: 'Dresses',
    price: 85000,
    stock: 10,
    sizes: 'UK 8, UK 10, UK 12, UK 14, UK 16',
    colours: 'Midnight Black, Emerald Green',
    description: '',
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  });

  const categories = ['all', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleCopyPitch = (p: Product) => {
    const pitch = `✨ *${p.name}*
💰 ₦${p.price.toLocaleString()}
SKU: ${p.sku}
👗 Sizes: ${p.sizes.join(', ')}
🎨 Colours: ${p.colours.join(', ')}

${p.description}

Would you like to reserve yours before it sells out? WhatsApp us now!`;

    navigator.clipboard.writeText(pitch);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name.trim() || !newProduct.sku.trim()) return;

    onAddProduct({
      name: newProduct.name,
      sku: newProduct.sku,
      category: newProduct.category,
      price: Number(newProduct.price),
      stock: Number(newProduct.stock),
      sizes: newProduct.sizes.split(',').map((s) => s.trim()).filter(Boolean),
      colours: newProduct.colours.split(',').map((c) => c.trim()).filter(Boolean),
      description: newProduct.description,
      image: newProduct.image,
      isActive: true,
    });

    setShowAddModal(false);
    setNewProduct({
      name: '',
      sku: '',
      category: 'Dresses',
      price: 85000,
      stock: 10,
      sizes: 'UK 8, UK 10, UK 12, UK 14',
      colours: 'Midnight Black',
      description: '',
      image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80',
      isActive: true,
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Product Catalog & Inventory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            LUMA FASHION catalog with real-time stock levels, pricing in ₦, and WhatsApp share templates.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-2xs transition-colors flex items-center space-x-1.5 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by product name, SKU, or style..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredProducts.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/95 text-slate-800 shadow-2xs backdrop-blur-xs">
                  {p.sku}
                </span>
                <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900/80 text-white backdrop-blur-xs">
                  {p.category}
                </span>
              </div>

              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1">
                    {p.name}
                  </h4>
                  <span className="font-extrabold text-emerald-700 text-sm whitespace-nowrap">
                    ₦{p.price.toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {p.description}
                </p>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                  <span>Stock: <strong className={p.stock < 10 ? 'text-amber-600' : 'text-slate-800'}>{p.stock} units</strong></span>
                  <span className="truncate max-w-[130px]">Sizes: {p.sizes.join(', ')}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => handleCopyPitch(p)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors shadow-2xs"
              >
                {copiedId === p.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Copy WhatsApp Card</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onDeleteProduct(p.id)}
                title="Delete product"
                className="ml-2 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Product Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Product to Catalog"
        subtitle="Provide fashion garment specifications for WhatsApp sharing."
      >
        <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Product Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Royal Silk Palazzo Set"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">SKU Code *</label>
              <input
                type="text"
                required
                placeholder="LUM-DRS-011"
                value={newProduct.sku}
                onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Category</label>
              <select
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white"
              >
                <option value="Dresses">Dresses</option>
                <option value="Two-Piece Sets">Two-Piece Sets</option>
                <option value="Tops & Shirts">Tops & Shirts</option>
                <option value="Skirts">Skirts</option>
                <option value="Outerwear">Outerwear</option>
                <option value="Pants & Trousers">Pants & Trousers</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Price in ₦ *</label>
              <input
                type="number"
                required
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Inventory Units</label>
              <input
                type="number"
                value={newProduct.stock}
                onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Sizes (comma-separated)</label>
              <input
                type="text"
                value={newProduct.sizes}
                onChange={(e) => setNewProduct({ ...newProduct, sizes: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Colours</label>
              <input
                type="text"
                value={newProduct.colours}
                onChange={(e) => setNewProduct({ ...newProduct, colours: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Image URL</label>
            <input
              type="url"
              value={newProduct.image}
              onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Description</label>
            <textarea
              rows={3}
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs"
              placeholder="Fabric details, silhouette, occasion fit..."
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700"
            >
              Save Product
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
