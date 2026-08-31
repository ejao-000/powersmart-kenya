import React from 'react';

// Nairobi-inspired city skyline silhouette used as a dimmed/blurred backdrop
// on the login screen.
export const CitySkyline: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 1440 320"
    preserveAspectRatio="xMidYMax slice"
    className={className}
    aria-hidden
  >
    <g fill="#0a1526">
      {/* Back row */}
      <rect x="0" y="180" width="70" height="140" />
      <rect x="90" y="150" width="46" height="170" />
      <rect x="150" y="200" width="60" height="120" />
      <rect x="228" y="120" width="40" height="200" />
      <rect x="286" y="170" width="56" height="150" />
      <rect x="360" y="130" width="48" height="190" />
      <rect x="426" y="200" width="62" height="120" />
      <rect x="506" y="100" width="38" height="220" />
      <rect x="560" y="160" width="60" height="160" />
      <rect x="636" y="130" width="44" height="190" />
      <rect x="696" y="190" width="58" height="130" />
      <rect x="770" y="140" width="40" height="180" />
      <rect x="826" y="110" width="52" height="210" />
      <rect x="894" y="180" width="64" height="140" />
      <rect x="974" y="150" width="42" height="170" />
      <rect x="1032" y="90" width="50" height="230" />
      <rect x="1098" y="170" width="58" height="150" />
      <rect x="1172" y="130" width="44" height="190" />
      <rect x="1232" y="200" width="62" height="120" />
      <rect x="1310" y="150" width="46" height="170" />
      <rect x="1372" y="180" width="68" height="140" />
    </g>
    <g fill="#0d1b3d">
      {/* Front row */}
      <rect x="30" y="220" width="84" height="100" />
      <rect x="130" y="240" width="52" height="80" />
      <rect x="196" y="200" width="72" height="120" />
      <rect x="284" y="250" width="44" height="70" />
      <rect x="342" y="190" width="66" height="130" />
      <rect x="424" y="230" width="48" height="90" />
      <rect x="488" y="210" width="78" height="110" />
      <rect x="582" y="250" width="40" height="70" />
      <rect x="636" y="200" width="64" height="120" />
      <rect x="716" y="230" width="50" height="90" />
      <rect x="782" y="190" width="80" height="130" />
      <rect x="878" y="240" width="46" height="80" />
      <rect x="940" y="210" width="68" height="110" />
      <rect x="1024" y="250" width="44" height="70" />
      <rect x="1084" y="200" width="76" height="120" />
      <rect x="1176" y="230" width="52" height="90" />
      <rect x="1244" y="210" width="72" height="110" />
      <rect x="1332" y="245" width="48" height="75" />
      <rect x="1396" y="225" width="44" height="95" />
    </g>
    {/* Lit windows on front row */}
    <g fill="#2a5a9c" opacity="0.55">
      <rect x="150" y="252" width="6" height="8" />
      <rect x="168" y="252" width="6" height="8" />
      <rect x="150" y="270" width="6" height="8" />
      <rect x="212" y="214" width="6" height="8" />
      <rect x="230" y="214" width="6" height="8" />
      <rect x="212" y="234" width="6" height="8" />
      <rect x="248" y="234" width="6" height="8" />
      <rect x="356" y="204" width="6" height="8" />
      <rect x="374" y="204" width="6" height="8" />
      <rect x="356" y="224" width="6" height="8" />
      <rect x="392" y="224" width="6" height="8" />
      <rect x="502" y="224" width="6" height="8" />
      <rect x="520" y="224" width="6" height="8" />
      <rect x="502" y="242" width="6" height="8" />
      <rect x="538" y="242" width="6" height="8" />
      <rect x="650" y="214" width="6" height="8" />
      <rect x="668" y="214" width="6" height="8" />
      <rect x="650" y="234" width="6" height="8" />
      <rect x="686" y="234" width="6" height="8" />
      <rect x="798" y="204" width="6" height="8" />
      <rect x="816" y="204" width="6" height="8" />
      <rect x="798" y="224" width="6" height="8" />
      <rect x="834" y="224" width="6" height="8" />
      <rect x="954" y="224" width="6" height="8" />
      <rect x="972" y="224" width="6" height="8" />
      <rect x="954" y="242" width="6" height="8" />
      <rect x="990" y="242" width="6" height="8" />
      <rect x="1098" y="214" width="6" height="8" />
      <rect x="1116" y="214" width="6" height="8" />
      <rect x="1098" y="234" width="6" height="8" />
      <rect x="1134" y="234" width="6" height="8" />
      <rect x="1258" y="224" width="6" height="8" />
      <rect x="1276" y="224" width="6" height="8" />
      <rect x="1258" y="242" width="6" height="8" />
      <rect x="1294" y="242" width="6" height="8" />
    </g>
  </svg>
);

export default CitySkyline;
