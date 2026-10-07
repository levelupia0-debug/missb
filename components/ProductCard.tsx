/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
  onBookService?: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, onBookService }) => {
  return (
    <div
      className="group flex flex-col gap-6 cursor-pointer reveal-on-scroll"
      onClick={() => onClick(product)}
    >
      <div className="relative w-full aspect-[4/5] overflow-hidden bg-[#EBE7DE] reveal-on-scroll reveal-scale">
        <img
          src={product.imageUrl}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-1000 ease-in-out group-hover:scale-110 sepia-[0.08]"
        />

        {/* Hover overlay with "View Service" - minimalistic */}
        <div className="absolute inset-0 bg-[#2C2A26]/0 group-hover:bg-[#2C2A26]/10 transition-colors duration-500 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 flex flex-col items-center gap-2">
            <span className="bg-[#F5F2EB]/95 backdrop-blur text-[#2C2A26] px-6 py-3 rounded-full text-xs uppercase tracking-widest font-medium whitespace-nowrap">
              View Ritual
            </span>
          </div>
        </div>
      </div>

      <div className="text-center reveal-on-scroll reveal-delay-1">
        <div className="flex items-center justify-center gap-2 text-xs font-light text-[#5D5A53] mb-2 tracking-wide">
          <span>{product.category}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{product.duration}</span>
        </div>
        <h3 className="text-2xl font-serif font-medium text-[#2C2A26] mb-2 group-hover:opacity-70 transition-opacity">
          {product.name}
        </h3>
        <p className="text-sm font-light text-[#5D5A53] mb-4 max-w-xs mx-auto line-clamp-2 leading-relaxed">
          {product.description}
        </p>
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm font-medium text-[#2C2A26] tabular-nums">
            From ${product.price}
          </span>
          {onBookService && (
            <>
              <span className="text-[#D6D1C7]" aria-hidden="true">|</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onBookService(product);
                }}
                className="text-xs uppercase tracking-widest text-[#2C2A26] underline underline-offset-4 hover:opacity-60 transition-opacity whitespace-nowrap"
              >
                Book Now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
