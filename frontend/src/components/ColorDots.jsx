const COLOR_MAP = {
  black: '#000000',
  white: '#FFFFFF',
  blue: '#1D428A',
  red: '#CE1141',
  orange: '#F58426',
  yellow: '#FDB927',
  green: '#007A33',
  purple: '#552583',
  navy: '#0C2340',
  gold: '#FDB927',
  gray: '#8A8D90',
  grey: '#8A8D90',
  teal: '#00778B',
  pink: '#E56020',
  cream: '#FFF1CD',
  silver: '#C4CED4',
  maroon: '#6F263D',
};

export default function ColorDots({ colors }) {
  if (!colors || colors.length === 0) return null;

  return (
    <div className="flex gap-1 items-center">
      {colors.map((color, i) => (
        <span
          key={i}
          className="inline-block w-4 h-4 rounded-full border border-gray-300"
          style={{ backgroundColor: COLOR_MAP[color.toLowerCase()] || '#D1D5DB' }}
          title={color}
        />
      ))}
    </div>
  );
}
