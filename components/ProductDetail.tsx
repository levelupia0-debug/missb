/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Product } from '../types';

interface ProductDetailProps {
  product: Product;
  onBack: () => void;
  onAddToCart: (product: Product) => void;
  onBookNow?: (product: Product) => void;
}

const ProductDetail: React.FC<ProductDetailProps> = ({
  product,
  onBack,
  onAddToCart,
  onBookNow
}) => {
  const [selectedLength, setSelectedLength] = useState<string>('Standard');
  const hairLengths = ['Standard', 'Mid-Back', 'Waist Length'];
  const showLengths =
    product.category === 'Braids & Protective' ||
    product.category === 'Color & Extensions';

  return (
    <div className="pt-28 min-h-screen bg-[#F5F2EB] animate-fade-in-up">
      <div className="max-w-[1800px] mx-auto px-6 md:px-12 pb-24">
        {/* Breadcrumb / Back */}
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#A8A29E] hover:text-[#2C2A26] transition-colors mb-8"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Back to Services
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          {/* Left: Main Image */}
          <div className="flex flex-col gap-4">
            <div className="w-full aspect-[4/5] bg-[#EBE7DE] overflow-hidden">
              <img
                src={product.imageUrl}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover animate-fade-in-up"
              />
            </div>
          </div>

          {/* Right: Details */}
          <div className="flex flex-col justify-center max-w-xl">
            <div className="flex items-center gap-3 text-sm font-medium text-[#A8A29E] uppercase tracking-widest mb-2">
              <span>{product.category}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{product.duration}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif text-[#2C2A26] mb-3">
              {product.name}
            </h1>
            <p className="text-lg font-serif italic text-[#5D5A53] mb-6">
              {product.tagline}
            </p>
            <div className="flex items-baseline gap-4 mb-8">
              <span className="text-2xl font-light text-[#2C2A26] tabular-nums">
                Starting at ${product.price}
              </span>
              <span className="text-xs uppercase tracking-widest text-[#A8A29E]">
                Duration: {product.duration}
              </span>
            </div>

            <p className="text-[#5D5A53] leading-relaxed font-light text-lg mb-8 border-b border-[#D6D1C7] pb-8">
              {product.longDescription || product.description}
            </p>

            {showLengths && (
              <div className="mb-8">
                <span className="block text-xs font-bold uppercase tracking-widest text-[#2C2A26] mb-4">
                  Preferred Length / Density Note
                </span>
                <div className="flex flex-wrap gap-4">
                  {hairLengths.map((length) => (
                    <button
                      key={length}
                      onClick={() => setSelectedLength(length)}
                      className={`px-5 py-3 text-xs uppercase tracking-widest border transition-all duration-300 whitespace-nowrap ${
                        selectedLength === length
                          ? 'border-[#2C2A26] bg-[#2C2A26] text-[#F5F2EB]'
                          : 'border-[#D6D1C7] text-[#5D5A53] hover:border-[#2C2A26]'
                      }`}
                    >
                      {length}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4">
              <button
                onClick={() => {
                  if (onBookNow) {
                    onBookNow(product);
                  } else {
                    onAddToCart(product);
                  }
                }}
                className="w-full py-5 bg-[#2C2A26] text-[#F5F2EB] uppercase tracking-widest text-sm font-medium hover:bg-[#433E38] transition-colors"
              >
                Book Appointment — ${product.price} ({product.duration})
              </button>

              <button
                onClick={() => onAddToCart(product)}
                className="w-full py-4 border border-[#2C2A26] text-[#2C2A26] uppercase tracking-widest text-xs font-medium hover:bg-[#EBE7DE] transition-colors"
              >
                Save to Selection
              </button>

              <div className="mt-8 pt-6 border-t border-[#D6D1C7]/60">
                <span className="block text-xs font-bold uppercase tracking-widest text-[#2C2A26] mb-4">
                  Included in Your Ritual
                </span>
                <ul className="space-y-2 text-sm text-[#5D5A53]">
                  {product.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <span className="w-1 h-1 bg-[#2C2A26] rounded-full"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
