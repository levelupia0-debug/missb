/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { IMG_TREATMENT, IMG_SILK_COLOR } from '../constants';

const Features: React.FC = () => {
  return (
    <section className="bg-[#EBE7DE]">
      {/* Feature Block 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[80vh]">
        <div className="order-2 lg:order-1 relative h-[500px] lg:h-auto overflow-hidden">
          <img
            src={IMG_TREATMENT}
            alt="Botanical Apothecary and Scalp Rituals"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-[1.5s]"
          />
        </div>
        <div className="order-1 lg:order-2 flex flex-col justify-center p-12 lg:p-24 bg-[#EBE7DE]">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#A8A29E] mb-6">
            Our Philosophy
          </span>
          <h3 className="text-4xl md:text-5xl font-serif mb-8 text-[#2C2A26] leading-tight">
            Botanical care <br /> that honors your crown.
          </h3>
          <p className="text-lg text-[#5D5A53] font-light leading-relaxed mb-12 max-w-md">
            Every ritual is formulated with cold-pressed baobab, camellia oil, and silk peptides—designed to nurture follicular integrity over time.
          </p>
        </div>
      </div>

      {/* Feature Block 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[80vh]">
        <div className="flex flex-col justify-center p-12 lg:p-24 bg-[#2C2A26] text-[#F5F2EB]">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#A8A29E] mb-6">
            The Sanctuary
          </span>
          <h3 className="text-4xl md:text-5xl font-serif mb-8 text-[#F5F2EB] leading-tight">
            Stillness by default.
          </h3>
          <p className="text-lg text-[#A8A29E] font-light leading-relaxed mb-12 max-w-md">
            One guest per station, unrushed consultations, and quiet botanical steam rituals.
          </p>
        </div>
        <div className="relative h-[500px] lg:h-auto overflow-hidden">
          <img
            src={IMG_SILK_COLOR}
            alt="Luminous Silk Press and Dimensional Color"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-[1.5s] brightness-90"
          />
        </div>
      </div>
    </section>
  );
};

export default Features;
