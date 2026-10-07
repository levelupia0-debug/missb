/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { PRODUCTS } from '../constants';
import { Product } from '../types';
import ProductCard from './ProductCard';

const categories = [
  'All',
  'Cut & Styling',
  'Braids & Protective',
  'Color & Extensions',
  'Rituals & Bridal'
];

interface ProductGridProps {
  services?: Product[];
  onProductClick: (product: Product) => void;
  onBookService?: (product: Product) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({
  services = PRODUCTS,
  onProductClick,
  onBookService
}) => {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'All') return services;
    return services.filter((p) => p.category === activeCategory);
  }, [activeCategory, services]);

  return (
    <section id="products" className="py-32 px-6 md:px-12 bg-[#F5F2EB]">
      <div className="max-w-[1800px] mx-auto">
        {/* Header Area */}
        <div className="flex flex-col items-center text-center mb-24 space-y-6 reveal-on-scroll">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#A8A29E]">
            Bespoke Hair Architecture
          </span>
          <h2 className="text-4xl md:text-6xl font-serif text-[#2C2A26] reveal-on-scroll reveal-delay-1">
            The Service Collection
          </h2>
          <p className="max-w-xl text-[#5D5A53] font-light leading-relaxed reveal-on-scroll reveal-delay-2">
            Every appointment includes a diagnostic scalp consultation and our signature botanical steam cleanse. Select a service to view details or reserve your time.
          </p>

          {/* Minimal Filter */}
          <div className="flex flex-wrap justify-center gap-8 pt-6 border-t border-[#D6D1C7]/50 w-full max-w-3xl reveal-on-scroll reveal-delay-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-sm uppercase tracking-widest pb-1 border-b transition-all duration-300 whitespace-nowrap ${
                  activeCategory === cat
                    ? 'border-[#2C2A26] text-[#2C2A26]'
                    : 'border-transparent text-[#A8A29E] hover:text-[#2C2A26]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Large Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-20">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={onProductClick}
              onBookService={onBookService}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductGrid;
