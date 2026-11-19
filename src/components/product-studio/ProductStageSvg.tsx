import React from 'react';
import { Product, ProductColor, StudioLayer } from '../../types';
import { StudioZoneSpec } from '../productStudioConfigs';

interface ProductStageSvgProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  product: Product;
  selectedColor: ProductColor;
  selectedVariantLabel?: string;
  activeSide: 'front' | 'back';
  activeZone: StudioZoneSpec;
  activeLayers: StudioLayer[];
  selectedLayerId: string | null;
  showPrintGuides: boolean;
  showLayersOnPreview: boolean;
  poloPhotoUrl?: string;
  capPhotoUrl?: string;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onSelectLayer: (id: string | null) => void;
  onDoubleClickTextLayer: (layer: StudioLayer) => void;
  onStartLayerDrag: (
    e: React.PointerEvent,
    layer: StudioLayer,
    mode: 'move' | 'resize' | 'rotate',
    corner?: 'nw' | 'ne' | 'se' | 'sw'
  ) => void;
}

export const ProductStageSvg: React.FC<ProductStageSvgProps> = ({
  svgRef,
  product,
  selectedColor,
  selectedVariantLabel,
  activeSide,
  activeZone,
  activeLayers,
  selectedLayerId,
  showPrintGuides,
  showLayersOnPreview,
  poloPhotoUrl,
  capPhotoUrl,
  onPointerMove,
  onPointerUp,
  onSelectLayer,
  onDoubleClickTextLayer,
  onStartLayerDrag,
}) => {
  const isPoloOrTshirt = product.productType === 'polo' || product.productType === 'tshirt';
  const isCap = product.productType === 'cap';
  const baseHex = selectedColor.garmentHex || selectedColor.hex || '#1A1A1E';

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 500 500"
      className="w-full h-full touch-none select-none"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <defs>
        <radialGradient id="prodStudioBg" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#E6ECF2" />
        </radialGradient>
        <linearGradient id="prodBodyShade" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id="prodCylinderGleam" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.4" />
          <stop offset="25%" stopColor="#FFFFFF" stopOpacity="0.18" />
          <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="85%" stopColor="#000000" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
        </linearGradient>
        <filter id="prodSoftShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000000" floodOpacity="0.16" />
        </filter>
      </defs>

      <rect x="0" y="0" width="500" height="500" fill="url(#prodStudioBg)" />

      {/* Product Base Visual */}
      {isPoloOrTshirt && poloPhotoUrl ? (
        <image
          href={poloPhotoUrl}
          x="40"
          y="15"
          width="420"
          height="470"
          preserveAspectRatio="xMidYMid meet"
        />
      ) : isCap && capPhotoUrl && activeSide === 'front' ? (
        <image
          href={capPhotoUrl}
          x="60"
          y="65"
          width="380"
          height="350"
          preserveAspectRatio="xMidYMid meet"
        />
      ) : isCap && activeSide === 'back' ? (
        <g filter="url(#prodSoftShadow)">
          <path
            d="M170 260 Q175 140 250 140 Q325 140 330 260 Z"
            fill={baseHex}
            stroke="#000000"
            strokeOpacity="0.25"
            strokeWidth="2"
          />
          <path d="M170 260 Q175 140 250 140 Q325 140 330 260 Z" fill="url(#prodBodyShade)" />
          <path
            d="M160 260 Q250 248 340 260 Q325 276 250 282 Q175 276 160 260 Z"
            fill={baseHex}
            stroke="#000000"
            strokeOpacity="0.3"
            strokeWidth="1.5"
          />
          <path
            d="M205 258 Q250 210 295 258 Z"
            fill="#EFF2F6"
            stroke="#000000"
            strokeOpacity="0.25"
            strokeWidth="1.5"
          />
          <rect x="200" y="248" width="100" height="13" rx="3" fill="#18181B" stroke="#3F3F46" strokeWidth="1" />
          {[208, 218, 228, 238, 248, 258, 268, 278, 288].map((cx) => (
            <circle key={cx} cx={cx} cy="254" r="1.8" fill="#71717A" />
          ))}
          <circle cx="250" cy="140" r="5" fill="#27272A" />
          <line x1="250" y1="140" x2="250" y2="210" stroke="#000000" strokeOpacity="0.25" strokeWidth="1.5" />
        </g>
      ) : product.productType === 'mug' ? (
        <image
          href={
            activeSide === 'back'
              ? '/assets/mug/mug_back_blank.webp'
              : '/assets/aistudio/Blank_White_Ceramic_Mug_b82bfadb.webp'
          }
          x="10"
          y="70"
          width="480"
          height="340"
          preserveAspectRatio="xMidYMid meet"
        />
      ) : product.productType === 'umbrella' ? (
        <g filter="url(#prodSoftShadow)">
          <rect x="244" y="210" width="12" height="196" rx="3" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />
          <rect x="246" y="210" width="4" height="196" fill="#F8FAFC" fillOpacity="0.7" />
          <rect x="240" y="294" width="20" height="14" rx="3" fill="#94A3B8" stroke="#475569" strokeWidth="1" />
          <circle cx="256" cy="301" r="2.2" fill="#1E293B" />
          <path d="M244 388 L194 448 L203 451 L248 400 Z" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />
          <path d="M256 388 L306 448 L297 451 L252 400 Z" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />
          <rect x="246" y="395" width="8" height="44" rx="2" fill="#94A3B8" stroke="#475569" strokeWidth="1" />
          <circle cx="198" cy="449" r="4" fill="#18181B" />
          <circle cx="302" cy="449" r="4" fill="#18181B" />
          <circle cx="250" cy="439" r="4" fill="#18181B" />
          <line x1="215" y1="424" x2="285" y2="424" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
          <rect x="239" y="382" width="22" height="14" rx="3" fill="#94A3B8" stroke="#475569" strokeWidth="1" />
          <path d="M74 202 Q250 182 426 202 L420 218 Q250 202 80 218 Z" fill="#0F172A" fillOpacity="0.22" />
          <path d="M250 82 Q145 104 75 196 L168 196 Q204 128 250 82 Z" fill={baseHex} stroke="#000000" strokeOpacity="0.14" strokeWidth="1.2" />
          <path d="M250 82 Q355 104 425 196 L332 196 Q296 128 250 82 Z" fill={baseHex} stroke="#000000" strokeOpacity="0.14" strokeWidth="1.2" />
          <path d="M250 82 Q204 128 168 196 L332 196 Q296 128 250 82 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.2" />
          <path d="M75 196 Q145 104 250 82 Q355 104 425 196 Z" fill="url(#prodBodyShade)" fillOpacity="0.35" />
          <path d="M75 196 L168 196 L168 238 Q122 243 75 236 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.2" />
          <path d="M168 196 L332 196 L332 242 Q250 247 168 242 Z" fill={baseHex} stroke="#000000" strokeOpacity="0.18" strokeWidth="1.2" />
          <path d="M332 196 L425 196 L425 236 Q378 243 332 238 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.2" />
          <circle cx="75" cy="197" r="3" fill="#CBD5E1" />
          <circle cx="168" cy="197" r="2.5" fill="#CBD5E1" />
          <circle cx="332" cy="197" r="2.5" fill="#CBD5E1" />
          <circle cx="425" cy="197" r="3" fill="#CBD5E1" />
          <circle cx="250" cy="76" r="7.5" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.2" />
          <circle cx="248" cy="74" r="2.5" fill="#FFFFFF" />
        </g>
      ) : product.productType === 'canopy' ? (
        <g filter="url(#prodSoftShadow)">
          <rect x="132" y="152" width="236" height="236" fill="#0B162C" fillOpacity="0.88" />
          <rect x="150" y="152" width="8" height="235" fill="#1E293B" />
          <rect x="342" y="152" width="8" height="235" fill="#1E293B" />
          <line x1="150" y1="272" x2="350" y2="272" stroke="#334155" strokeWidth="4" />
          <polygon points="250,48 112,108 388,108" fill="#1E3A68" stroke="#0F1F3D" strokeWidth="1.5" />
          <polygon points="250,48 250,108 388,108" fill="#132645" fillOpacity="0.45" />
          <rect x="116" y="108" width="268" height="46" rx="2" fill="#162B4D" stroke="#0F1F3D" strokeWidth="1.5" />
          <line x1="118" y1="114" x2="382" y2="114" stroke="#FFFFFF" strokeOpacity="0.18" strokeDasharray="3 3" strokeWidth="1" />
          <line x1="118" y1="148" x2="382" y2="148" stroke="#FFFFFF" strokeOpacity="0.18" strokeDasharray="3 3" strokeWidth="1" />
          <rect x="116" y="154" width="12" height="270" rx="2" fill="#18181B" stroke="#3F3F46" strokeWidth="1" />
          <rect x="372" y="154" width="12" height="270" rx="2" fill="#18181B" stroke="#3F3F46" strokeWidth="1" />
          <rect x="114" y="208" width="16" height="10" rx="2" fill="#27272A" />
          <rect x="370" y="208" width="16" height="10" rx="2" fill="#27272A" />
          <ellipse cx="122" cy="426" rx="14" ry="5" fill="#18181B" stroke="#52525B" strokeWidth="1" />
          <ellipse cx="378" cy="426" rx="14" ry="5" fill="#18181B" stroke="#52525B" strokeWidth="1" />
          <rect x="128" y="266" width="244" height="138" rx="2" fill="#162B4D" stroke="#0F1F3D" strokeWidth="1.5" />
          <rect x="128" y="266" width="244" height="138" rx="2" fill="url(#prodBodyShade)" fillOpacity="0.4" />
          <line x1="130" y1="273" x2="370" y2="273" stroke="#FFFFFF" strokeOpacity="0.22" strokeDasharray="3 3" strokeWidth="1" />
          <line x1="130" y1="397" x2="370" y2="397" stroke="#FFFFFF" strokeOpacity="0.18" strokeDasharray="3 3" strokeWidth="1" />
          {selectedVariantLabel && (
            <g>
              <rect x="206" y="434" width="88" height="20" rx="10" fill="#0F172A" />
              <text x="250" y="447" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="700" fontFamily="monospace">
                {selectedVariantLabel} · 7 ft H
              </text>
            </g>
          )}
        </g>
      ) : product.productType === 'standee' ? (
        <g filter="url(#prodSoftShadow)">
          <rect x="247" y="42" width="6" height="20" rx="2" fill="#27272A" />
          <rect x="172" y="438" width="24" height="16" rx="4" fill="#18181B" stroke="#3F3F46" strokeWidth="1" />
          <rect x="304" y="438" width="24" height="16" rx="4" fill="#18181B" stroke="#3F3F46" strokeWidth="1" />
          <rect x="136" y="410" width="228" height="32" rx="12" fill="#18181B" stroke="#3F3F46" strokeWidth="1.5" />
          <rect x="136" y="410" width="228" height="11" rx="6" fill="#FFFFFF" fillOpacity="0.08" />
          <circle cx="144" cy="426" r="10" fill="#27272A" stroke="#52525B" strokeWidth="1" />
          <circle cx="356" cy="426" r="10" fill="#27272A" stroke="#52525B" strokeWidth="1" />
          <rect x="150" y="56" width="200" height="356" fill="#121318" stroke="#27272A" strokeWidth="1.5" />
          <rect x="150" y="56" width="200" height="356" fill="url(#prodBodyShade)" fillOpacity="0.28" />
          <rect x="142" y="46" width="216" height="14" rx="6" fill="#18181B" stroke="#3F3F46" strokeWidth="1.2" />
          <rect x="240" y="45" width="20" height="16" rx="3" fill="#27272A" />
        </g>
      ) : product.productType === 'display' || product.productType === 'table' ? (
        <g filter="url(#prodSoftShadow)">
          <rect x="154" y="126" width="12" height="94" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />
          <rect x="157" y="126" width="4" height="94" fill="#F8FAFC" />
          <rect x="334" y="126" width="12" height="94" fill="#CBD5E1" stroke="#64748B" strokeWidth="1" />
          <rect x="337" y="126" width="4" height="94" fill="#F8FAFC" />
          <rect x="124" y="52" width="252" height="76" rx="8" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.8" />
          <rect x="124" y="52" width="252" height="76" rx="8" fill="url(#prodBodyShade)" fillOpacity="0.14" />
          <rect x="112" y="218" width="276" height="16" rx="7" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
          <rect x="120" y="234" width="260" height="206" rx="6" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
          <rect x="120" y="234" width="260" height="206" rx="6" fill="url(#prodCylinderGleam)" fillOpacity="0.2" />
          <rect x="114" y="434" width="272" height="14" rx="6" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.5" />
        </g>
      ) : (
        <rect
          x="145"
          y="90"
          width="210"
          height="320"
          rx="28"
          fill={baseHex}
          stroke="#000000"
          strokeOpacity="0.2"
          strokeWidth="2"
        />
      )}

      {/* Print Area Dashed Guides */}
      {showPrintGuides && (
        <g data-studio-chrome="true" className="pointer-events-none">
          {isPoloOrTshirt && activeSide === 'front' ? (
            <>
              <path
                d="M 184 148 L 236 148 L 236 226 L 264 226 L 264 148 L 316 148 L 316 408 L 184 408 Z"
                fill="none"
                stroke="#FF7900"
                strokeOpacity="0.55"
                strokeWidth="1.2"
                strokeDasharray="4 4"
              />
              <rect
                x={activeZone.cx - activeZone.maxW / 2}
                y={activeZone.cy - activeZone.maxH / 2}
                width={activeZone.maxW}
                height={activeZone.maxH}
                rx={4}
                fill="#FF7900"
                fillOpacity="0.06"
                stroke="#FF7900"
                strokeWidth="1.2"
                strokeDasharray="3 2"
              />
              <text
                x={activeZone.cx}
                y={activeZone.cy - activeZone.maxH / 2 - 5}
                textAnchor="middle"
                fill="#FF7900"
                fontSize="8.5"
                fontWeight="700"
              >
                {activeZone.label}
              </text>
            </>
          ) : isPoloOrTshirt && activeSide === 'back' ? (
            <>
              <rect
                x="180"
                y="112"
                width="140"
                height="296"
                fill="none"
                stroke="#CBD5E1"
                strokeOpacity="0.65"
                strokeWidth="1.2"
                strokeDasharray="4 4"
              />
              <rect
                x={activeZone.cx - activeZone.maxW / 2}
                y={activeZone.cy - activeZone.maxH / 2}
                width={activeZone.maxW}
                height={activeZone.maxH}
                rx={4}
                fill="#FF7900"
                fillOpacity="0.06"
                stroke="#FF7900"
                strokeWidth="1.2"
                strokeDasharray="3 2"
              />
              <text
                x={activeZone.cx}
                y={activeZone.cy - activeZone.maxH / 2 - 5}
                textAnchor="middle"
                fill="#FF7900"
                fontSize="8.5"
                fontWeight="700"
              >
                {activeZone.label}
              </text>
            </>
          ) : (
            <>
              <rect
                x={activeZone.cx - activeZone.maxW / 2}
                y={activeZone.cy - activeZone.maxH / 2}
                width={activeZone.maxW}
                height={activeZone.maxH}
                rx={4}
                fill="#FF7900"
                fillOpacity="0.05"
                stroke="#FF7900"
                strokeOpacity="0.85"
                strokeWidth="1.2"
                strokeDasharray="4 3"
              />
              <text
                x={activeZone.cx}
                y={activeZone.cy - activeZone.maxH / 2 - 5}
                textAnchor="middle"
                fill="#FF7900"
                fontSize="8.5"
                fontWeight="700"
              >
                {activeZone.label}
              </text>
            </>
          )}
        </g>
      )}

      {/* Render All Layers */}
      {showLayersOnPreview &&
        activeLayers
          .filter((l) => l.visible !== false)
          .map((layer) => {
            const isSelected = selectedLayerId === layer.id;
            const halfW = layer.width / 2;
            const halfH = layer.height / 2;
            const curveVal = layer.curve ?? 36;
            const pathId = `prod-curve-${layer.id}`;
            const displayText =
              layer.textTransform === 'uppercase'
                ? (layer.text || '').toUpperCase()
                : layer.text || '';

            return (
              <g
                key={layer.id}
                transform={`translate(${layer.x}, ${layer.y}) rotate(${layer.rotation || 0})`}
                opacity={layer.opacity ?? 1}
                className={layer.locked ? 'cursor-not-allowed' : 'cursor-move'}
                onPointerDown={(e) => onStartLayerDrag(e, layer, 'move')}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectLayer(layer.id);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (layer.kind === 'text' || layer.kind === 'curved-text') {
                    onDoubleClickTextLayer(layer);
                  }
                }}
              >
                {(layer.kind === 'logo' || layer.kind === 'image') && layer.dataUrl && (
                  <g transform={layer.flipX ? 'scale(-1, 1)' : undefined}>
                    <image
                      href={layer.dataUrl}
                      x={-halfW}
                      y={-halfH}
                      width={layer.width}
                      height={layer.height}
                      preserveAspectRatio="xMidYMid meet"
                    />
                  </g>
                )}

                {layer.kind === 'text' && (
                  <text
                    x={
                      layer.textAlign === 'left'
                        ? -halfW
                        : layer.textAlign === 'right'
                        ? halfW
                        : 0
                    }
                    y={(layer.fontSize || 14) * 0.34}
                    textAnchor={
                      layer.textAlign === 'left'
                        ? 'start'
                        : layer.textAlign === 'right'
                        ? 'end'
                        : 'middle'
                    }
                    fill={layer.textColor || '#FFFFFF'}
                    fontSize={layer.fontSize || 14}
                    fontFamily={layer.fontFamily || 'Space Grotesk, sans-serif'}
                    fontWeight={layer.fontWeight || '700'}
                    fontStyle={layer.fontStyle || 'normal'}
                    letterSpacing={layer.letterSpacing ?? 0.6}
                  >
                    {displayText}
                  </text>
                )}

                {layer.kind === 'curved-text' && (
                  <g>
                    <defs>
                      <path
                        id={pathId}
                        d={`M ${-halfW} ${curveVal > 0 ? 10 : -10} Q 0 ${-curveVal * 0.75} ${halfW} ${
                          curveVal > 0 ? 10 : -10
                        }`}
                      />
                    </defs>
                    <text
                      fill={layer.textColor || '#FFFFFF'}
                      fontSize={layer.fontSize || 13}
                      fontFamily={layer.fontFamily || 'Space Grotesk, sans-serif'}
                      fontWeight={layer.fontWeight || '700'}
                      fontStyle={layer.fontStyle || 'normal'}
                      letterSpacing={layer.letterSpacing ?? 1}
                      textAnchor="middle"
                    >
                      <textPath href={`#${pathId}`} startOffset="50%">
                        {displayText}
                      </textPath>
                    </text>
                  </g>
                )}

                {layer.kind === 'shape' && (
                  <>
                    {layer.shapeType === 'rect' && (
                      <rect
                        x={-halfW}
                        y={-halfH}
                        width={layer.width}
                        height={layer.height}
                        rx={layer.borderRadius ?? 6}
                        fill={layer.fillColor || '#FF7900'}
                        stroke={layer.strokeColor || 'none'}
                        strokeWidth={layer.strokeWidth || 0}
                      />
                    )}
                    {layer.shapeType === 'pill' && (
                      <rect
                        x={-halfW}
                        y={-halfH}
                        width={layer.width}
                        height={layer.height}
                        rx={Math.min(halfW, halfH)}
                        fill={layer.fillColor || '#FF7900'}
                      />
                    )}
                    {layer.shapeType === 'circle' && (
                      <ellipse cx={0} cy={0} rx={halfW} ry={halfH} fill={layer.fillColor || '#FF7900'} />
                    )}
                    {layer.shapeType === 'ring' && (
                      <ellipse
                        cx={0}
                        cy={0}
                        rx={Math.max(4, halfW - 3)}
                        ry={Math.max(4, halfH - 3)}
                        fill="none"
                        stroke={layer.strokeColor || layer.fillColor || '#FF7900'}
                        strokeWidth={layer.strokeWidth || 4}
                      />
                    )}
                    {layer.shapeType === 'triangle' && (
                      <polygon
                        points={`0,${-halfH} ${halfW},${halfH} ${-halfW},${halfH}`}
                        fill={layer.fillColor || '#FF7900'}
                      />
                    )}
                    {layer.shapeType === 'line' && (
                      <rect
                        x={-halfW}
                        y={-Math.max(1.5, halfH / 2)}
                        width={layer.width}
                        height={Math.max(3, layer.height)}
                        rx={2}
                        fill={layer.fillColor || '#FF7900'}
                      />
                    )}
                  </>
                )}

                {isSelected && (
                  <g data-studio-chrome="true">
                    <rect
                      x={-halfW - 4}
                      y={-halfH - 4}
                      width={layer.width + 8}
                      height={layer.height + 8}
                      fill="none"
                      stroke={layer.locked ? '#64748B' : '#FF7900'}
                      strokeWidth="1.3"
                      strokeDasharray="3 2"
                    />
                    {!layer.locked && (
                      <>
                        <line
                          x1={0}
                          y1={-halfH - 4}
                          x2={0}
                          y2={-halfH - 18}
                          stroke="#FF7900"
                          strokeWidth="1.3"
                        />
                        <circle
                          cx={0}
                          cy={-halfH - 22}
                          r={16}
                          fill="transparent"
                          className="cursor-grab"
                          onPointerDown={(e) => onStartLayerDrag(e, layer, 'rotate')}
                        />
                        <circle
                          cx={0}
                          cy={-halfH - 22}
                          r={5.5}
                          fill="#FFFFFF"
                          stroke="#FF7900"
                          strokeWidth="1.8"
                          className="pointer-events-none"
                        />
                        {(
                          [
                            { k: 'nw' as const, cx: -halfW - 4, cy: -halfH - 4, cur: 'cursor-nwse-resize' },
                            { k: 'ne' as const, cx: halfW + 4, cy: -halfH - 4, cur: 'cursor-nesw-resize' },
                            { k: 'se' as const, cx: halfW + 4, cy: halfH + 4, cur: 'cursor-nwse-resize' },
                            { k: 'sw' as const, cx: -halfW - 4, cy: halfH + 4, cur: 'cursor-nesw-resize' },
                          ]
                        ).map((c) => (
                          <g key={c.k}>
                            <rect
                              x={c.cx - 14}
                              y={c.cy - 14}
                              width={28}
                              height={28}
                              fill="transparent"
                              className={c.cur}
                              onPointerDown={(e) => onStartLayerDrag(e, layer, 'resize', c.k)}
                            />
                            <rect
                              x={c.cx - 4.5}
                              y={c.cy - 4.5}
                              width={9}
                              height={9}
                              rx={2}
                              fill="#FFFFFF"
                              stroke="#FF7900"
                              strokeWidth="1.7"
                              className="pointer-events-none"
                            />
                          </g>
                        ))}
                      </>
                    )}
                  </g>
                )}
              </g>
            );
          })}
    </svg>
  );
};
